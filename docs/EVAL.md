# Evaluation Methodology — doc-rag

## Why you can't skip this
A RAG without eval numbers is a demo, not engineering. This file is the method; `BENCHMARKS.md` carries the results (ships with v1.0).

## Metrics (Ragas)

| Metric | Definition | Interpretation |
|--------|-----------|----------------|
| **Faithfulness** | Fraction of answer claims supported by retrieved context | Hallucination detector; aim ≥ 0.85 |
| **Answer relevance** | Does answer address the question? | Question-answer alignment; aim ≥ 0.80 |
| **Context precision** | Of retrieved chunks, how many are relevant? | Retrieval precision; aim ≥ 0.70 |
| **Context recall** | Of ideal context, how much was retrieved? | Retrieval recall; aim ≥ 0.75 |

## Golden set
50 curated Q/A pairs with expert-annotated "gold" source spans.
- 20 single-hop (answer in one chunk)
- 15 multi-hop (synthesize across 2-3 chunks)
- 10 negative ("not in corpus" — model should refuse)
- 5 adversarial (near-duplicates, paraphrase traps)

Stored in `evals/golden.jsonl`, **not** committed to the training/ingest corpus.

## LLM-as-judge protocol
- Judge model: Claude Opus (different from generator Sonnet — avoid self-bias)
- Rubric: 1-5 on faithfulness, relevance, completeness
- Pairwise comparison for ablations (naive vs hybrid etc.)

## Ablation matrix (published in BENCHMARKS.md)

| Config | Faith | Rel | CtxP | CtxR | Latency p95 |
|--------|-------|-----|------|------|-------------|
| Baseline (dense only) | — | — | — | — | — |
| + BM25 hybrid (RRF) | — | — | — | — | — |
| + Cohere rerank | — | — | — | — | — |
| + Contextual retrieval | — | — | — | — | — |
| + HyDE | — | — | — | — | — |
| Full stack | — | — | — | — | — |

Numbers get filled during P4. **Report honest losses** — e.g., HyDE hurts on short factoid queries.
