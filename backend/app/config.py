"""Typed configuration via pydantic-settings. Reads ARENA_* env vars / .env."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_prefix="ARENA_", extra="ignore"
    )

    host: str = "127.0.0.1"
    port: int = 7860
    debug: bool = False  # NEVER default-on (audit B: Werkzeug RCE was on by default)

    ollama_host: str = "http://127.0.0.1:11434"
    history_limit: int = 40
    max_models: int = 6
    request_timeout_s: int = 120

    # Optional bearer token; if empty, auth is skipped (local single-user default).
    auth_token: str | None = None
    # Browser dev origin(s) allowed to call the API (Vite).
    allowed_origins: list[str] = [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ]

    # Optional cloud-judge API keys (fallback when the UI doesn't supply one per
    # request). Keys are never logged. Local-first stays default; cloud is opt-in.
    anthropic_api_key: str | None = None
    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    openrouter_api_key: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"


settings = Settings()
