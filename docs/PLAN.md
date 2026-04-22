# /ultraplan — doc-rag

## Goal
Production-grade RAG reference: hybrid + rerank + prompt cache + Ragas eval, in ~10 working days.

## Stack
- Python 3.13 + uv
- FastAPI + Streamlit
- Postgres 16 + pgvector (Docker)
- `anthropic` SDK with prompt caching
- `voyageai` (embed), `cohere` (rerank), `ragas` (eval)
- `docling` (ingest), `llama-index-core` (readers)
- `mcp` (MCP server SDK)

## Phases

### P0 — Scaffold (Day 1)
- [x] uv project, FastAPI + Streamlit stubs
- [x] Postgres + pgvector docker-compose
- [x] Docs: RESEARCH, PLAN, THINK, EVAL, MCP
- [x] CI

### P1 — Ingestion (Days 2-3)
- [ ] `ingest/readers.py` — markdown, HTML, PDF via Docling
- [ ] `ingest/chunker.py` — structural + semantic split
- [ ] `ingest/contextual.py` — Anthropic contextual retrieval prefix
- [ ] `ingest/embed.py` — Voyage-3 (primary), BGE-M3 (fallback)
- [ ] `scripts/ingest.py` — CLI to ingest a corpus
- [ ] Schema: `chunks` table with vec + tsvector + metadata

### P2 — Retrieval (Days 4-5)
- [ ] `retrieve/dense.py` — pgvector cosine with HNSW index
- [ ] `retrieve/sparse.py` — Postgres BM25 via `pg_search` or tsvector + ts_rank
- [ ] `retrieve/hybrid.py` — RRF fusion (k=60)
- [ ] `retrieve/rerank.py` — Cohere Rerank v3 + BGE fallback
- [ ] `retrieve/hyde.py` — HyDE implementation
- [ ] Unit tests on a small fixture corpus

### P3 — Generation (Days 6-7)
- [ ] `generate/prompt.py` — system + citations schema
- [ ] `generate/claude.py` — Anthropic client with prompt caching
- [ ] `generate/citations.py` — extract source spans, ground to chunk IDs
- [ ] `api/main.py` — `POST /ask` endpoint with streaming
- [ ] Measure cache hit rate; log to OTLP

### P4 — Eval (Day 8)
- [ ] `eval/golden.py` — 50-question curated dataset
- [ ] `eval/ragas_runner.py` — run Ragas metrics
- [ ] `eval/report.py` — publish BENCHMARK.md with numbers
- [ ] Ablation: naive vs hybrid vs +rerank vs +contextual vs +HyDE

### P5 — UI + MCP (Days 9-10)
- [ ] Streamlit: chat UI with citation highlights, expandable context
- [ ] MCP server: `retrieve_docs` tool exposing retrieval as Claude Desktop tool
- [ ] `docs/MCP.md` with setup instructions
- [ ] v1.0.0 release

## Acceptance
- ✅ Ingest 1000 docs in < 5 min on CPU
- ✅ Hybrid + rerank beats dense-only by ≥ 15% on faithfulness
- ✅ Cache hit rate > 80% on repeat queries
- ✅ Streamlit demo shows citations inline
- ✅ MCP server registers in Claude Desktop
- ✅ Eval report published with honest losses

## Sibling integrations
- `idas-scene-ai`: `/scene/query` proxies to this service
- `pm-copilot`: uses this as its retrieval tool
- `quanta-forecast`: Streamlit demo can ask "explain this forecast"
