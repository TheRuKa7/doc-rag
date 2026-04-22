# PRD — doc-rag

**Owner:** Rushil Kaul · **Status:** P0 scaffold complete · **Last updated:** 2026-04-22

## 1. TL;DR

A production-grade RAG service with **hybrid retrieval + rerank + contextual
chunking + prompt caching + Ragas evals + MCP server**. Opinionated about
quality — ships with a golden set and refuses to regress.

## 2. Problem

Most RAG demos are naive: one dense retriever, no rerank, no eval loop. They
work on day 1 and rot on day 30. `doc-rag` codifies the 2024–25 set of
techniques (hybrid, rerank, contextual retrieval) into a repo that is *also*
queryable from Claude Desktop via MCP.

## 3. Goals

| G | Goal | Measure |
|---|------|---------|
| G1 | Hybrid retrieval beats dense-only on heterogeneous queries | recall@10 ≥ dense-only on lexical subset; parity on semantic |
| G2 | Rerank improves top-k precision | context_precision@5 +≥ 8 points vs no rerank |
| G3 | Contextual retrieval improves disambiguation | faithfulness ≥ 0.80 on golden set |
| G4 | Prompt cache cuts answer cost | ≥ 60% cache hit on common system prefixes |
| G5 | MCP server works in Claude Desktop | Kai flow passes E2E |

## 4. Non-goals

- Best-in-class latency for first token (we accept ~1–2 s p95 for quality)
- Multi-modal (tables / images) retrieval in v1
- Managed multi-tenant SaaS in v1

## 5. Users & stakeholders

See `USECASES.md` P1–P5. Technical decision maker is usually an ML PM (Juno)
or a staff engineer; integrator is a technical writer or support-ops lead.

## 6. Functional requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| F1 | Ingest PDF / HTML / MD / Confluence / Notion | P0 |
| F2 | Chunker with token-aware boundaries (~500–1000 tokens) | P0 |
| F3 | Contextualiser (document-level summary prepended to each chunk) | P1 |
| F4 | Dense embeddings (BGE-large-en, Voyage, or OpenAI; pluggable) | P0 |
| F5 | BM25 index (Postgres `tsvector` or a lucene sidecar) | P1 |
| F6 | RRF fusion of dense + sparse | P1 |
| F7 | Rerank step (Cohere v3 / Voyage / local bge-reranker) | P1 |
| F8 | Answer generation with prompt cache | P1 |
| F9 | Ragas + custom golden-set evaluation | P1 |
| F10 | MCP server exposing `retrieve`, `get_document`, `search` | P2 |
| F11 | Incremental ingest (content-hash diff) | P2 |
| F12 | Per-query telemetry (latency, scores, cost) | P1 |

## 7. Non-functional requirements

| Category | Requirement |
|----------|-------------|
| Latency | p95 < 2s end-to-end answer; retrieve-only < 500 ms |
| Cost | < 3 ¢/query at 1k QPS (cache-warm) |
| Privacy | All retrieval can run on-prem (disable rerank / use local embeddings) |
| Repro | Deterministic chunk IDs; ingest is content-hashed |
| Observability | Full per-query trace; Ragas nightly on golden set |
| Portability | Runs on a single Postgres 16 + Docker Compose |

## 8. Success metrics

- **Primary:** Ragas faithfulness + context-precision on the committed golden set.
- **Secondary:** MCP usage events from Claude Desktop.
- **Ops:** p95 end-to-end latency; cache-hit rate; cost/query.

## 9. Milestones

| Phase | Deliverable | ETA |
|-------|-------------|-----|
| P0 | Scaffold + dense-only retrieve + /healthz | shipped |
| P1 | Hybrid + rerank + contextual + prompt cache + Ragas | +3 weeks |
| P2 | MCP server + incremental ingest + admin UI | +5 weeks |
| P3 | Multi-tenant + finer ACLs + image-in-chunk support | +8 weeks |

## 10. Dependencies

- Postgres 16 + pgvector
- Anthropic SDK (for prompt caching + answer LLM)
- Cohere / Voyage SDKs (optional reranker)
- `ragas` + custom golden-set runner
- MCP Python SDK (Anthropic)

## 11. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Reranker cost balloons at high QPS | High | Cost | Cache top-k per (query-hash, corpus-version); rerank only the delta |
| pgvector performance at >10M chunks | Med | Latency | HNSW index + IVFFlat fallback; shard by tenant |
| Contextualiser cost per chunk | High | Ingest cost | Batch Claude Haiku calls; reuse per-document summary across chunks |
| Golden set rots | Cert. | False confidence | Weekly review cadence; diff vs previous Ragas run |
| MCP schema drift | Med | Client breakage | Pin MCP SDK; integration test on each upgrade |

## 12. Open questions

- Should answer generation default to Haiku or Sonnet? Leaning Sonnet for quality, Haiku as toggle.
- Do we expose a finetuneable reranker or keep it API-based? Leave both options open.
- Ship a browser admin UI or keep it CLI-only for v1?
