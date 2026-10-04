# Security Policy

## Reporting a vulnerability

Do not open a public GitHub issue with exploit details.

- Prefer GitHub [private vulnerability reporting](https://github.com/sammy995/Local-LLM-Arena/security/advisories/new)
- If that form is unavailable, open an issue titled **Security — contact request** with no details. A maintainer will reply with a private channel.

Include: what is wrong, how to reproduce it, which commit or version, and any mitigation you already tried.

We aim to acknowledge reports within a few days.

## What this app is

Local LLM Arena is a single-user eval bench. It talks to Ollama on this machine and serves the UI from FastAPI on `127.0.0.1:7860` by default. Prompts stay local unless you opt into a cloud judge and paste a key.

## Threat model (honest)

- Optional bearer auth: set `ARENA_AUTH_TOKEN` (not `WEB_CHAT_TOKEN`). Empty means the API is open on the bind address.
- State-changing routes (`/api/chat`, `/api/chat/stream`, `/api/judge`, model pull/delete) check `Origin` so a random website cannot drive your local Ollama.
- History lives in browser `localStorage`, unencrypted. Anyone with this browser profile can read it.
- Cloud-judge keys typed in the UI stay in RAM for that session. Keys in `.env` (`ARENA_ANTHROPIC_API_KEY`, `ARENA_OPENAI_API_KEY`, `ARENA_OPENROUTER_API_KEY`) never belong in git.
- There is no multi-user login, no encryption at rest, and no rate limit. Do not put this on the public internet without a reverse proxy, TLS, and auth you actually trust.

## Supported versions

Security fixes land on `main`. Older tags are not maintained.
