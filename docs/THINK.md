# /ultrathink — doc-rag

## 1. Why RAG and why now?

RAG is the default pattern for anchoring LLMs in specific corpora. By 2026 it's standardized enough that a well-engineered reference impl is more valuable than a novel one — it's what interviewers screen for.

The bar has moved:
- **2022 signal:** "I built a RAG" (chunk + cosine + GPT)
- **2024 signal:** "I built a hybrid RAG with reranking"
- **2026 signal:** "I built a RAG with contextual retrieval, cached prompts, Ragas evals, and an MCP server"

This repo targets the 2026 signal.

## 2. Why pgvector specifically?

Most RAG tutorials use Chroma/Pinecone. pgvector wins for three reasons:
1. **One DB for everything** — vectors, BM25 (tsvector), and metadata in one transaction
2. **Ops simplicity** — Postgres is what teams already run
3. **Transactional ingest** — atomic updates of chunks + embeddings

Tradeoff: Qdrant and LanceDB are faster on pure vector-search workloads at 100M+ scale. For docs (< 10M chunks), pgvector is ample.

## 3. Why contextual retrieval?

Anthropic published the contextual retrieval technique in Sept 2024 with striking numbers: 49% fewer retrieval failures when chunks are prefixed with a 50-100 token context summary before embedding.

It's cheap to implement (one small Claude call per chunk at ingest time, cached) and it's mechanistically sensible — isolated chunks lose their framing, and RAG-on-questions typically needs that framing.

Most RAG demos don't do this. Portfolio differentiator with real engineering justification.

## 4. Why hybrid + rerank?

- **Dense alone** → fails on rare terms, proper nouns, exact quotes
- **BM25 alone** → fails on paraphrase, synonyms
- **Hybrid (RRF)** → consistently 10-20% MRR uplift
- **+ Rerank** → another 10-20% on top

Interviewer test: "A user searches for 'CVE-2024-1234' — does pure dense retrieval work?" Answer: no, BM25 dominates for exact identifiers. Hybrid handles both.

## 5. Why Ragas + golden set?

90% of RAG demos have zero evaluation numbers. That's the most common failure mode — you can't improve what you can't measure.

Ragas gives 4 automated metrics out of the box:
- Faithfulness (hallucination detector)
- Answer relevance (is the model answering the question?)
- Context precision (did retrieval surface relevant chunks?)
- Context recall (did retrieval miss anything?)

Paired with a 50-question golden set with expert answers, this is a **real** eval. Portfolio flex.

## 6. Why MCP server?

MCP is Anthropic's protocol for exposing tools to Claude. Shipping `doc-rag` both as a REST API *and* an MCP tool signals:
- Familiarity with Anthropic's agent ecosystem
- Thinking beyond "service behind HTTP" into "AI-native interfaces"
- Practical skill — you can actually use this in your own Claude Desktop

One small entry-point file for a disproportionate hiring signal.

## 7. Prompt caching is non-negotiable

Per Anthropic's guide: cache the system prompt + static corpus context. This gives 90% cost reduction on repeated queries — mandatory for any production RAG.

The skill-driven discipline here: `cache_control: {"type": "ephemeral"}` on the static blocks. 5-min TTL means staying above 12 queries/hour per cache key to amortize. Log cache hit rate to OTLP.

## 8. Tradeoffs

| Decision | Alt | Why |
|----------|-----|-----|
| Voyage-3 embed | OpenAI text-embedding-3 | Better MTEB, cheaper |
| Cohere Rerank | BGE local | Better quality; BGE as free fallback |
| pgvector | Qdrant | Ops simplicity; Qdrant faster at scale |
| Streamlit | Next.js | Chat UI is Streamlit's forte; ship fast |
| Docling | Unstructured.io | Better tables, active development |
| MCP server | HTTP-only | Differentiation cost: ~50 LoC |

## 9. Risks

| Risk | Mitigation |
|------|------------|
| API costs during dev | BGE-M3 + local-Claude fallback paths |
| Cache miss costs | Log hit rate; alert if < 70% |
| Eval-set leakage | Golden set stored in `evals/` not `corpus/` |
| Docling edge cases (complex PDFs) | Fallback to Unstructured for failures |
| Citation accuracy | Postprocess: verify each citation string appears in cited chunk |

## 10. What v2 brings

- Self-RAG / CRAG for self-correcting retrieval
- Multi-corpus with per-corpus system prompts
- Graph RAG variant for multi-doc reasoning
- Fine-tuned embedding model on domain data
- Web search fallback when retrieval confidence low

## 11. Interview talking points

- *"Why hybrid?"* — dense misses exact terms; BM25 misses paraphrase; RRF fuses ranks
- *"How do you evaluate RAG?"* — Ragas 4 metrics + golden set + LLM judge with different model
- *"What's contextual retrieval?"* — prepend doc-level summary to each chunk before embedding; 49% fewer failures
- *"How do you cache?"* — system + corpus cached ephemerally; 5-min TTL; log hit rate
- *"Why MCP?"* — expose the tool to Claude Desktop directly; AI-native interface
