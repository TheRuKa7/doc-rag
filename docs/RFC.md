# RFC-001 — doc-rag architecture

**Author:** Rushil Kaul · **Status:** Draft · **Target release:** P1–P2

## 1. Summary

Five-stage pipeline: **ingest → contextualise → index → retrieve+rerank → generate**.
Storage in Postgres 16 + pgvector. Retrievers and reranker are pluggable via
small Protocol classes. MCP server is a thin facade over the same retrieval
functions the HTTP API uses.

## 2. Context

`RESEARCH.md` covers the technique landscape (hybrid vs single-retriever,
contextual retrieval, rerank tradeoffs). `PRD.md` owns the goals. This RFC
pins module layout, data model, query-path implementation, and MCP surface.

## 3. Detailed design

### 3.1 Components

| Component | Role |
|-----------|------|
| `ingest` | CLI + library — crawl / parse / chunk / hash |
| `contextualise` | Batch LLM call: produce document summary; prepend to each chunk |
| `index` | Write chunks + embeddings + `tsvector` to Postgres |
| `retrieve` | Hybrid BM25 + dense + RRF; returns top-K |
| `rerank` | Pluggable (Cohere v3, Voyage, local bge) |
| `generate` | Anthropic (Sonnet/Haiku) with prompt cache |
| `eval` | Ragas + golden-set runner |
| `api` | FastAPI — `/ingest`, `/ask`, `/retrieve`, `/healthz` |
| `mcp` | MCP server exposing `retrieve`, `get_document`, `search` |

### 3.2 Data model (Postgres)

```sql
CREATE TABLE documents (
  id uuid PRIMARY KEY,
  source_url text NOT NULL,
  title text,
  content_hash text NOT NULL,
  version int NOT NULL,
  created_at timestamptz DEFAULT now(),
  latest bool DEFAULT true,
  UNIQUE (source_url, version)
);

CREATE TABLE chunks (
  id uuid PRIMARY KEY,
  document_id uuid REFERENCES documents(id),
  chunk_index int NOT NULL,
  content_hash text NOT NULL,         -- stable chunk identity across ingests
  text text NOT NULL,                 -- already prepended with document context
  tokens int NOT NULL,
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
  embedding vector(1024)              -- configurable; pgvector
);

CREATE INDEX chunks_tsv_gin ON chunks USING gin (tsv);
CREATE INDEX chunks_hnsw   ON chunks USING hnsw (embedding vector_cosine_ops);

CREATE TABLE query_log (
  id uuid PRIMARY KEY,
  at timestamptz DEFAULT now(),
  query text NOT NULL,
  retriever_cfg jsonb,
  retrieved_ids uuid[],
  rerank_ids uuid[],
  latency_ms int,
  cost_usd numeric(12,6),
  cache_hit bool
);
```

### 3.3 Retrieval protocol

```python
class Retriever(Protocol):
    def retrieve(self, query: str, top_k: int) -> list[Hit]: ...

class Reranker(Protocol):
    def rerank(self, query: str, hits: list[Hit], top_k: int) -> list[Hit]: ...
```

### 3.4 Hybrid query (SQL sketch)

```sql
WITH bm25 AS (
  SELECT id, ts_rank(tsv, plainto_tsquery('english', $1)) AS score
  FROM chunks ORDER BY score DESC LIMIT 40
),
dense AS (
  SELECT id, 1 - (embedding <=> $2) AS score
  FROM chunks ORDER BY embedding <=> $2 LIMIT 40
)
SELECT id, SUM(1.0 / (60 + rnk)) AS rrf
FROM (
  SELECT id, row_number() OVER (ORDER BY score DESC) AS rnk FROM bm25
  UNION ALL
  SELECT id, row_number() OVER (ORDER BY score DESC) AS rnk FROM dense
) u
GROUP BY id ORDER BY rrf DESC LIMIT 40;
```

Constants: RRF `k=60` (per Cormack 2009), initial `top_k=40`, final after rerank `k=8`.

### 3.5 Contextual retrieval (Anthropic technique)

For each document:

1. Build a ≤ 200-token summary via Haiku: "This document is about X. It describes Y…"
2. For each chunk: `chunk.text := summary + "\n\n" + raw_chunk`.
3. Embed the augmented chunk; store in pgvector.

Cost model: one summary per document (not per chunk). Batch via prompt-caching
if using Anthropic.

### 3.6 Prompt caching

Answer-generation prompt layout:

```
[system: stable instructions + format contract]   ← cache_control: "ephemeral"
[user: retrieved chunks (variable)]
[user: question]
```

Anthropic prompt-cache applies to the stable prefix. Typical repeat-query
hit rates are 60–90%; we budget for 60% in cost targets.

### 3.7 MCP server surface

```python
# src/doc_rag/mcp/server.py
@server.tool()
async def retrieve(query: str, top_k: int = 5) -> list[Chunk]: ...

@server.tool()
async def get_document(document_id: str) -> Document: ...

@server.tool()
async def search(query: str, k: int = 10, rerank: bool = True) -> list[Chunk]: ...
```

Installed in Claude Desktop via `claude_desktop_config.json`:

```json
{ "mcpServers": { "doc-rag": { "command": "uv", "args": ["run","doc-rag","mcp"] } } }
```

### 3.8 Evaluation harness

- **Golden set**: `eval/golden.jsonl` — `{query, ground_truth_chunk_ids, expected_answer_hint}`.
- **Ragas metrics**: faithfulness, context_precision, answer_relevance, context_recall.
- CI nightly runs `doc-rag eval` and commits results; a regression > 3 points vs
  rolling mean fails the run.

### 3.9 Observability

- OTEL spans per stage (retrieve / rerank / generate).
- Per-query log to `query_log` with latency + cost + retrieved ids.
- Grafana dashboard JSON committed in `ops/grafana/`.

## 4. Alternatives considered

| Alt | Why not |
|-----|---------|
| LangChain / LlamaIndex as the backbone | Heavy; abstractions obscure the hot path |
| Weaviate / Pinecone | Extra service; overkill until >50M chunks |
| Text-only index (no rerank) | Known to leave precision on the table |
| Naive chunking (no contextualisation) | Subtle ambiguity bugs on pronoun-heavy text |

## 5. Tradeoffs

- Prepending context to every chunk raises storage and embed cost by ~15%.
  Acceptable for the retrieval-quality win.
- Reranker is a paid dependency; we offer a local `bge-reranker-v2-m3` path
  for on-prem deployments at ~2 point precision cost.
- pgvector over a dedicated vector DB — simpler ops, good enough to ~20M chunks.

## 6. Rollout plan

1. P1 wk 1: hybrid + RRF + CLI ingest.
2. P1 wk 2: contextualiser + reranker plug.
3. P1 wk 3: Ragas + golden set + prompt cache.
4. P2 wk 4: MCP server + Claude Desktop integration.
5. P2 wk 5: incremental ingest + admin UI.

## 7. Open questions

- Store raw chunk text separately from context-prepended version? Likely yes
  (raw is useful for UI highlighting).
- Streaming answers via SSE — worth it for UX? Yes in P2.
- Per-tenant ACLs in v1 or v2? Lean v2 unless a design partner needs it.
