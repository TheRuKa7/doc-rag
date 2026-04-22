"""Chat UI — P5 ships full RAG flow; this is the scaffold."""
from __future__ import annotations

import streamlit as st

st.set_page_config(page_title="doc-rag", layout="wide")
st.title("📚 doc-rag")
st.caption("Hybrid retrieval · reranking · contextual · prompt-cached · cited.")

st.info(
    "🚧 Scaffold. Full chat + citations + ablation toggles ship in P5. "
    "See [docs/PLAN.md](https://github.com/TheRuKa7/doc-rag/blob/main/docs/PLAN.md)."
)

with st.sidebar:
    st.header("Retrieval config")
    hybrid = st.checkbox("Hybrid (BM25 + dense)", value=True)
    rerank = st.checkbox("Rerank (Cohere v3)", value=True)
    contextual = st.checkbox("Contextual retrieval", value=True)
    hyde = st.checkbox("HyDE", value=False)
    top_k = st.slider("Top-k retrieve", 5, 100, 40)

q = st.text_input("Ask a question about the corpus")
if q:
    st.write("*(Retrieval + generation ships in P5.)*")
