# /ultraresearch — doc-rag

*State of RAG for a 2026 portfolio. Verify against latest Anthropic / Cohere / LlamaIndex docs before shipping.*

## 1. RAG stack layers

### Ingestion
| Tool | Strength | Weakness |
|------|----------|----------|
| **Docling** (IBM, 2024) | PDFs with tables + math | Newer, less battle-tested |
| Unstructured.io | Broad format support | Slower, heavier deps |
| LlamaParse | Cloud-hosted, high accuracy | Not OSS-only |
| LlamaIndex readers | Many formats | Quality varies per reader |
| Mistral OCR | Excellent for scanned PDFs | API-only |

### Chunking
- **Fixed-size (token or char)** — baseline, often worst
- **Recursive character splitter** — LangChain default, OK
- **Semantic chunking** — split on embedding similarity changes
- **Structural** — respect headings, sections, code blocks
- **Contextual retrieval** (Anthropic 2024) — prepend doc summary to each chunk before embedding. **Biggest accuracy gain of any single technique**.

### Embedding models (ranked by MTEB as of late 2024)
| Model | Type | Dim | Notes |
|-------|------|-----|-------|
| **Voyage-3** | Closed API | 1024 | Best quality, fair price |
| **Cohere Embed v3** | Closed API | 1024 | Strong, good multilingual |
| **OpenAI text-embedding-3-large** | Closed | 3072 | Widely used, expensive |
| **BGE-M3** | Open | 1024 | Best open, multi-vector |
| **Nomic Embed v1.5** | Open | 768 | Smaller, fast |
| **Jina v3** | Open | 1024 | Task-specific prefixes |

**Pick:** Voyage-3 primary, BGE-M3 as free fallback.

### Vector databases
| DB | Ops simplicity | Features |
|----|----------------|----------|
| **pgvector** | ⭐⭐⭐⭐⭐ | Transactional, BM25 via Postgres |
| Qdrant | ⭐⭐⭐⭐ | Rust-fast, payload filters |
| Weaviate | ⭐⭐⭐ | GraphQL, modules |
| Pinecone | ⭐⭐⭐⭐ | Hosted, expensive |
| Chroma | ⭐⭐⭐⭐⭐ | Dev-friendly, small-scale |
| LanceDB | ⭐⭐⭐⭐ | Embedded, multimodal |

**Pick:** pgvector — one DB for everything (vectors + BM25 + metadata), transactional, zero extra ops.

### Retrieval
- **Dense (cosine over embeddings)** — semantic similarity
- **Sparse (BM25)** — keyword match
- **Hybrid (RRF fusion)** — best of both; k=60 is standard
- **HyDE** — generate hypothetical answer, embed it, retrieve
- **MultiQueryRetriever** — generate 3-5 query variants, union results

### Reranking
| Model | Latency | Quality |
|-------|---------|---------|
| **Cohere Rerank v3** | ~100ms | Best |
| BGE Reranker v2-m3 | ~50ms on GPU | Good, open |
| ColBERTv2 | ~20ms | Late-interaction, strong |
| LLM rerank (Claude/GPT) | 1-3s | Excellent but slow/costly |

**Pick:** Cohere Rerank v3 primary; BGE as fallback.

### Generation
- **Claude Sonnet 4.6+** — strong instruction following, 200K context, prompt caching
- **GPT-4.1** — good general model
- **Llama 3.3 70B** — best open option
- **Gemini 2.5 Pro** — long context (2M)

**Pick:** Claude Sonnet 4.6 with prompt caching on corpus context.

## 2. Evaluation

### Ragas metrics (go-to)
- **Faithfulness** — are claims in answer supported by context?
- **Answer relevance** — does answer address the question?
- **Context precision** — are retrieved chunks relevant?
- **Context recall** — was all relevant info retrieved?

### TruLens / DeepEval alternatives — similar metrics, different ergonomics.

### Custom: LLM-as-judge anchored on golden dataset
- Golden set: 50-100 questions with expert answers + cited sources
- Judge model ≠ generator model (avoid self-bias)

## 3. Advanced: beyond vanilla RAG

| Technique | Gain | Complexity |
|-----------|------|------------|
| Contextual retrieval | 49% fewer retrieval failures (Anthropic 2024) | Low |
| Query decomposition | 10-30% on multi-hop | Medium |
| HyDE | 5-15% on hard queries | Low |
| Graph RAG (MS) | Big on multi-doc reasoning | High |
| Self-RAG / CRAG | Reduces hallucination | High |
| Agentic RAG | Multi-step retrieve-and-refine | High (see `pm-copilot`) |

**v1 includes:** contextual retrieval + HyDE. Agentic is pushed to `pm-copilot`.

## 4. Prompt caching (per Anthropic SDK guide)

- Cache the system prompt + static corpus context
- 5-minute TTL; writes cost 25% more, hits cost 10% of base rate
- **Cache hit → 90% cost reduction + 85% latency reduction** on repeated queries
- Must mark `cache_control: {"type": "ephemeral"}` on cached blocks
- This is non-negotiable for a portfolio RAG app

## 5. MCP angle

Anthropic's Model Context Protocol lets tools expose retrieval as a callable to Claude Desktop.
- Ship a second entry point: `uv run python -m doc_rag.mcp.server`
- Register in Claude Desktop config
- Claude can then call `retrieve_docs(query, top_k)` as a tool
- Demonstrates Rushil knows Anthropic's agent ecosystem — strong hiring signal
