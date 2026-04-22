"""FastAPI entrypoint. Routes in P3 — see docs/PLAN.md."""
from __future__ import annotations

from fastapi import FastAPI

from doc_rag import __version__
from doc_rag.config import settings

app = FastAPI(title="doc-rag", version=__version__)


@app.get("/healthz")
async def healthz() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "version": __version__,
        "embedder": settings.embedder,
        "reranker": settings.reranker,
        "prompt_cache": settings.prompt_cache_enabled,
    }


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": "doc-rag",
        "version": __version__,
        "repo": "https://github.com/TheRuKa7/doc-rag",
    }
