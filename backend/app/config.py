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


settings = Settings()
