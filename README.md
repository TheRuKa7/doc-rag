# doc-rag

> **Production-grade RAG over technical documentation.** Hybrid retrieval (BM25 + dense + RRF), Cohere reranking, Claude generation with prompt caching, and Ragas-based evals. Also exposed as an MCP server.

[![CI](https://github.com/TheRuKa7/doc-rag/actions/workflows/ci.yml/badge.svg)](https://github.com/TheRuKa7/doc-rag/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Built by [Rushil Kaul](https://github.com/TheRuKa7) — a canonical reference for what RAG should look like in 2026: hybrid, reranked, cached, and *measured*.

## Why this over 100 other RAG demos?

Most RAG demos stop at "embed + cosine." This repo ships:
- **Hybrid retrieval** — BM25 + dense + Reciprocal Rank Fusion (RRF)
- **Reranker** — Cohere Rerank v3 (BGE fallback)
- **Contextual retrieval** — Anthropic's chunk-prefixing technique
- **Prompt caching** — 90% cost reduction on repeated queries
- **Ragas evals** — faithfulness, answer relevance, context precision/recall
- **Citations** — every answer links back to source spans
- **MCP server** — retriever exposed as a Claude Desktop tool

## Stack

| Layer | Choice |
|-------|--------|
| Ingest | Docling (IBM) for PDFs, LlamaIndex readers for Markdown/HTML |
| Chunk | Semantic + structural; contextual prefix |
| Embed | Voyage-3 (primary), BGE-M3 (local fallback) |
| Vector DB | pgvector on Postgres 16 |
| Hybrid | BM25 (tsvector) + dense; RRF fusion |
| Rerank | Cohere Rerank v3 |
| Generate | Claude Sonnet 4.6 with prompt caching |
| Eval | Ragas + custom golden set |
| UI | Streamlit chat with citation highlights |
| Proto | MCP server exposing `retrieve_docs` tool |

## Corpora shipped

- Claude docs (Anthropic)
- MDN Web Docs subset
- Python 3.13 stdlib docs
- Custom: upload your own MD/PDF/HTML

## Docs

- [docs/RESEARCH.md](./docs/RESEARCH.md) — RAG SOTA 2026
- [docs/PLAN.md](./docs/PLAN.md) — phased rollout
- [docs/THINK.md](./docs/THINK.md) — why hybrid, why rerank, why eval
- [docs/EVAL.md](./docs/EVAL.md) — Ragas + golden set methodology
- [docs/MCP.md](./docs/MCP.md) — using as a Claude Desktop tool

## Quickstart

```bash
uv sync
docker compose up -d postgres
export ANTHROPIC_API_KEY=...
uv run python scripts/ingest.py --corpus claude-docs
uv run python scripts/ask.py --q "how does prompt caching work?"
uv run streamlit run streamlit_app/app.py
```

## License

MIT.
