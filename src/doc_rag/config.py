"""Settings — env-driven, typed, single source of truth."""
from __future__ import annotations

from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DOCRAG_", env_file=".env")

    # API keys
    anthropic_api_key: str = ""
    voyage_api_key: str = ""
    cohere_api_key: str = ""

    # Models
    embedder: Literal["voyage-3", "bge-m3"] = "voyage-3"
    reranker: Literal["cohere-v3", "bge-reranker-v2-m3"] = "cohere-v3"
    generator_model: str = "claude-sonnet-4-6-20250929"

    # Postgres
    postgres_url: str = "postgresql://localhost:5432/docrag"

    # Retrieval
    top_k_retrieve: int = 40
    top_k_rerank: int = 8
    rrf_k: int = 60
    use_hyde: bool = False
    use_contextual: bool = True

    # Prompt caching
    prompt_cache_enabled: bool = True


settings = Settings()
