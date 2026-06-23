# ADR-0001: FastAPI + React/Vite/shadcn for a local Ollama app

Date: 2026-06-23 · Status: Accepted

## Context

Local LLM Arena is a 100% local, offline, privacy-first multi-model LLM arena that
talks to a local Ollama instance (`localhost:11434`). The owner is Python-first. There
is no cloud, no user accounts, and no hosting requirement (it runs on the user's own
machine).

The previous app had two divergent Flask backends, a 3,518-line vanilla-JS frontend,
3,512 lines of CSS with 36 `!important`, unsanitized `innerHTML` rendering, and no
tests. A full rewrite was chosen over patching.

The stack decision was validated with the `founder-tech-stack` skill. Its 2026 default
(Next.js + Vercel + Supabase + Stripe + Claude API) is a cloud stack and was rejected:
every cloud layer is forced off by the offline/privacy/local-only constraints.

## Decision

- **Backend:** async **FastAPI** (single source of truth, Pydantic-validated),
  talking to Ollama via `ollama-python` `AsyncClient`. Replaces Flask + manual
  thread pools.
- **Frontend:** **React 19 + Vite 8 + TypeScript**, **Tailwind v4** + **shadcn/ui**.
- **State:** `localStorage` (single local user). Server-side persistence is a later,
  optional milestone — not day one.
- **Shipping:** in production FastAPI serves the built SPA (`frontend/dist`) so it runs
  as one local process on one URL.

## Alternatives considered

- **Next.js + Vercel + Supabase** (skill default) — rejected: cloud-oriented, drops
  Python, and there is no host/DB/auth requirement.
- **Keep Flask** — rejected: thread-per-model model, two divergent backends, no request
  validation, the double-generation streaming bug.
- **Browser → Ollama direct (no backend)** — rejected: no server-side validation or
  audit boundary, and CORS configuration burden on the end user's machine.

## Consequences

- (+) One typed backend, real async streaming, modern accessible UI, zero vendor
  lock-in, one-person operable forever (no servers).
- (+) Pydantic bounds turn bad params into 422 instead of 500; one `build_options()`
  passes all six hyperparameters; streaming does one generation per model.
- (−) Two dev processes (Vite + uvicorn) in development — mitigated by `scripts/dev.ps1`
  and single-process production serving.
- (−) The UI moves from Python-rendered templates to a TypeScript SPA; the backend
  stays Python.
