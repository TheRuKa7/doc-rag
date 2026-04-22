# DFD — doc-rag

## Level 0 — Context

```mermaid
flowchart LR
  SRC[Source corpus<br/>docs site / Confluence / Notion / PDFs]
  USER[End user<br/>via widget / agent / Claude Desktop]
  LLM[Anthropic Claude API]
  RERANK[Rerank API<br/>Cohere / Voyage]
  EMB[Embedding API<br/>or local model]
  DR((doc-rag))
  PG[(Postgres 16 + pgvector)]

  SRC -- crawl + parse --> DR
  DR -- embed --> EMB
  DR -- summarise --> LLM
  DR -- index / query --> PG
  USER -- /ask, /retrieve, MCP tools --> DR
  DR -- query + context --> LLM
  DR -- rerank --> RERANK
  DR -- answer + citations --> USER
```

## Level 1 — Pipeline stages

```mermaid
flowchart TD
  subgraph Ingest
    CR[1.0 Crawler / Reader<br/>sitemap / Confluence / Notion / file]
    PA[1.1 Parser<br/>HTML/PDF/MD -> text + meta]
    CH[1.2 Chunker<br/>token-aware]
    HS[1.3 Hasher<br/>stable chunk IDs]
  end

  subgraph Enrich
    CTX[2.0 Contextualiser<br/>document-level summary]
    EMB[2.1 Embedder]
  end

  subgraph Store
    PG[[Postgres<br/>documents / chunks]]
    VEC[[pgvector HNSW]]
    GIN[[tsvector GIN]]
  end

  subgraph Query
    HY[3.0 Hybrid retriever<br/>BM25 + dense + RRF]
    RR[3.1 Reranker<br/>Cohere / Voyage / local]
    GEN[3.2 Generator<br/>Anthropic + prompt cache]
  end

  subgraph Surface
    API[4.0 FastAPI<br/>/ask /retrieve /healthz]
    MCP[4.1 MCP server<br/>Claude Desktop tools]
    EV[4.2 Eval runner<br/>Ragas + golden set]
  end

  CR --> PA --> CH --> HS
  HS --> CTX --> EMB
  EMB --> PG
  EMB --> VEC
  CH --> GIN
  API --> HY
  MCP --> HY
  HY --> VEC
  HY --> GIN
  HY --> RR --> GEN
  GEN --> API
  GEN --> MCP
  EV --> HY
  EV --> GEN
```

## Level 2 — Ingest sequence (first-time)

```mermaid
sequenceDiagram
  autonumber
  participant U as CLI user
  participant I as Ingest
  participant S as Source
  participant C as Contextualiser
  participant E as Embedder
  participant DB as Postgres
  U->>I: doc-rag ingest --source X
  I->>S: fetch list of docs
  loop per document
    I->>S: fetch content
    I->>I: parse + clean
    I->>I: chunk (token-aware)
    I->>I: content_hash per chunk
    I->>C: summarise document (Haiku)
    C-->>I: ≤ 200-token summary
    loop per chunk
      I->>I: prepend summary to chunk.text
      I->>E: embed(chunk.text)
      E-->>I: vector
      I->>DB: insert chunk + embedding + tsvector
    end
  end
```

## Level 2 — `/ask` query sequence

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant A as API
  participant DB as Postgres
  participant R as Reranker
  participant L as Claude
  U->>A: POST /ask {query}
  A->>DB: hybrid query (BM25 + dense + RRF) top_k=40
  DB-->>A: hits[]
  A->>R: rerank(query, hits) top_k=8
  R-->>A: reranked[]
  A->>A: build prompt [system(cache) | context | question]
  A->>L: messages.create (prompt_cache on)
  L-->>A: answer + stop_reason
  A->>DB: insert query_log (latency, cost, cache_hit, ids)
  A-->>U: { answer, citations[] }
```

## Level 2 — MCP server integration with Claude Desktop

```mermaid
sequenceDiagram
  autonumber
  participant CD as Claude Desktop
  participant M as MCP server
  participant API as doc-rag internals
  CD->>M: initialize (stdio)
  M-->>CD: tools: retrieve, get_document, search
  CD->>M: tool_call retrieve {query, top_k}
  M->>API: retrieve(query, top_k)
  API-->>M: chunks[]
  M-->>CD: tool_result chunks[]
  CD->>CD: answer user, cite chunk ids
```

## Data stores

| Store | Purpose | Retention |
|-------|---------|-----------|
| `documents` | Source records + version history | Indefinite (30d for old versions) |
| `chunks` | Retrieval units + embeddings | Until re-ingested |
| `query_log` | Per-query audit + cost | 90 days default |
| `golden.jsonl` (in repo) | Eval harness fixtures | Versioned in git |

## Trust boundaries

```mermaid
flowchart LR
  subgraph Client
    USER
    CD[Claude Desktop]
  end
  subgraph VPC["Customer VPC / on-prem"]
    APP[doc-rag API + MCP]
    PG[(Postgres + pgvector)]
  end
  subgraph External["Third-party APIs (optional)"]
    AN[Anthropic]
    CO[Cohere / Voyage]
    VOY[Voyage embeddings]
  end
  USER -- HTTPS --> APP
  CD -- stdio MCP --> APP
  APP --> PG
  APP -. optional .-> AN
  APP -. optional .-> CO
  APP -. optional .-> VOY
```

## Data-egress toggles

Every external call is gated by a config flag. Privacy-sensitive deployments:

- `EMBEDDER=local-bge` — no embedding egress
- `RERANKER=local-bge-v2` — no rerank egress
- `GENERATOR=claude-haiku` or `none` — toggles answer generation egress
- `CONTEXTUALISER=disabled` — skips the document summary call

All of the above are honoured at startup and logged; disabling them degrades
quality (documented in THINK.md).

## Invariants

- Chunk IDs are deterministic from content-hash + chunk-index; re-ingest
  produces the same ID if content unchanged.
- `latest=true` at most once per `(source_url)`.
- Hybrid retrieval always returns at least one of BM25 or dense results if any
  exist (graceful on either backend being empty).
- `query_log` is append-only; a separate `query_log_redacted` view strips
  `query` for long-term storage.
