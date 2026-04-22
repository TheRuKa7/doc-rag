# USECASES — doc-rag

End-to-end flows for a production-grade hybrid retrieval system with
contextual chunking, rerank, prompt caching, Ragas evals, and a Model Context
Protocol (MCP) server so the same index is queryable from Claude Desktop.

## 1. Personas

| ID | Persona | Context | Primary JTBD |
|----|---------|---------|--------------|
| P1 | **Technical writer (Asha)** | Owns a 4k-page developer docs site; users file bad-answer tickets | "Let me plug in our docs, ship a /ask endpoint that doesn't hallucinate" |
| P2 | **Support ops lead (Dmitri)** | Zendesk macro library of 12k answered tickets; wants AI-assisted drafting | "Retrieve the 5 most similar past tickets and draft a reply" |
| P3 | **ML PM (Juno)** | Evaluating RAG vendors vs build | "Prove the rerank step earns its cost; show me Ragas numbers" |
| P4 | **Claude-Desktop power user (Kai)** | Wants to ask Claude about internal docs without pasting them in | "Give me an MCP server my Claude Desktop can point at" |
| P5 | **Security reviewer (Naomi)** | Reviewing a RAG deploy for data-leak risks | "Where exactly does the doc content live? Who can query it?" |

## 2. Jobs-to-be-done

JTBD-1. **Ingest** PDFs / HTML / Markdown / Confluence into versioned chunks.
JTBD-2. **Hybrid retrieve** (BM25 + dense + RRF) across those chunks.
JTBD-3. **Rerank** with Cohere / Voyage to lift top-k precision.
JTBD-4. **Contextualise** each chunk with a document-level summary (Anthropic technique).
JTBD-5. **Cache** prompts to cut cost on repeated contexts.
JTBD-6. **Evaluate** retrieval + answer quality with Ragas + a golden set.
JTBD-7. **Expose via MCP** so Claude Desktop can call the same retrieval layer.

## 3. End-to-end flows

### Flow A — Asha ships `/ask` for her docs site

1. Runs `doc-rag ingest --source https://docs.example.com/sitemap.xml`.
2. Pipeline crawls, splits into ~800-token chunks, stores in pgvector.
3. Contextualiser job summarises each document; prepends summary to each chunk.
4. Asha runs `doc-rag eval --golden ./golden.jsonl` — Ragas reports 0.84 faithfulness.
5. Ships `POST /ask` behind her help widget; latency p95 < 1.8 s.

### Flow B — Dmitri drafts a ticket reply

1. Incoming ticket → webhook POSTs to `doc-rag` with the ticket body.
2. Retriever fetches top-40 by hybrid; reranker keeps top-8.
3. LLM drafts a reply citing ticket IDs.
4. Agent surfaces draft to support; they approve/edit/send.

### Flow C — Juno runs a rerank ablation

1. Runs `doc-rag eval --compare "no_rerank,cohere-v3,voyage-rerank" --golden ./golden.jsonl`.
2. Output: table of faithfulness, answer-relevance, context-precision, cost/1k queries.
3. Juno writes a memo: "Rerank lifts context precision by 11 points at 2 ¢/query".

### Flow D — Kai wires the MCP server into Claude Desktop

1. In Claude Desktop, adds `doc-rag` MCP server via `claude_desktop_config.json`.
2. Claude now calls `retrieve(query, top_k)` and `get_document(id)` as tools.
3. Kai asks Claude "what's our rate-limit policy?" — Claude retrieves from the index
   and answers with citations.

### Flow E — Naomi audits the data path

1. Opens `docs/RFC.md` — sees that chunks live in Postgres, embeddings co-located,
   no third-party data egress unless rerank API is enabled.
2. Disables rerank (`RERANKER=none`) for an on-prem deploy; Ragas shows a
   4-point precision drop but zero egress.
3. Writes a memo: "Approved for internal docs; rerank requires DPA with Cohere".

### Flow F — Incremental re-ingest

1. Doc updated on upstream source; webhook fires `doc-rag ingest --url X`.
2. Pipeline computes content hash; unchanged chunks untouched (stable IDs).
3. Changed chunks get new version; old versions kept for 30 days.
4. Retriever always queries latest-version by default.

## 4. Acceptance scenarios

```gherkin
Scenario: Hybrid retrieval beats dense-only on lexical queries
  Given a query that is mostly rare keywords (e.g. SKU codes)
  When I run retrieve with hybrid=BM25+dense+RRF
  Then recall@10 is >= recall@10 for dense-only

Scenario: Rerank lifts context precision
  Given a fixed query set with labelled relevant chunks
  When I enable Cohere rerank v3 on top of hybrid top-40
  Then context_precision@5 is strictly higher than without rerank

Scenario: Contextual retrieval reduces embedding-only mismatches
  Given a chunk whose text alone is ambiguous (e.g. "the rate limit is 100")
  When the chunk is embedded WITH its document-level context prepended
  Then retrieval for "API rate limit" ranks it within top-5

Scenario: MCP server returns citations
  When Claude Desktop calls retrieve(query, top_k=5)
  Then the response contains 5 chunks, each with {id, text, score, source_url}

Scenario: Prompt cache hit reduces cost
  Given an answer-generation prompt with a stable system+context prefix
  When the same prefix is used in consecutive queries
  Then Anthropic cache hit is reported and per-query cost drops >= 60%
```

## 5. Non-use-cases

- Legal-grade citation accuracy (we minimise hallucination; we do not guarantee it)
- Real-time indexing (our refresh is event-driven, not streaming at tick level)
- Public-internet search (we index user-provided corpora only)
- Multi-modal RAG (images/tables) in v1
