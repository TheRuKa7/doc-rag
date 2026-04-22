"""Smoke tests."""
from __future__ import annotations

from fastapi.testclient import TestClient

from doc_rag import __version__
from doc_rag.api.main import app

client = TestClient(app)


def test_healthz() -> None:
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json()["version"] == __version__


def test_settings_load() -> None:
    from doc_rag.config import settings
    assert settings.embedder in {"voyage-3", "bge-m3"}
    assert settings.top_k_retrieve > 0
