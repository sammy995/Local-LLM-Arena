# Local LLM Arena: A Local-First Framework for Reproducible LLM Evaluation

**Author:** Shubham Lagad
**Repository:** https://github.com/sammy995/Local-LLM-Arena · **License:** MIT
**Document type:** Technical report (system & methodology). Version 1, 2026-06.

> Scope note. This report documents the *system and evaluation methodology*. Every
> behavioral claim below is grounded in the implementation and cites the source file.
> It deliberately reports **no headline ranking numbers**: producing a defensible
> leaderboard requires a capable judge and a sufficient prompt/model sample (§7). The
> framework, the exact procedure, and the export schema needed to generate such results
> are given in §6 so the study is reproducible by a third party.

---

## Abstract

Side-by-side LLM comparison and "LLM-as-judge" scoring are now standard practice, but the
dominant tooling (public arenas, hosted eval APIs) assumes the prompts and model outputs
may leave the user's machine. That assumption is disqualifying for evaluation on private,
regulated, or air-gapped data. **Local LLM Arena** is an open-source framework that runs
the full evaluation loop — parallel generation, blind human voting, anonymized
LLM-as-judge scoring, pairwise-Elo aggregation, and batch benchmarking with exportable
artifacts — entirely against a local [Ollama](https://ollama.com) instance, with cloud
judging available only as an explicit, key-gated opt-in. This report describes the
architecture, the evaluation methodology and its bias controls, the exact aggregation
math, a reproducibility protocol, and a candid account of the method's limitations.

---

## 1. Problem and stakes

Evaluating open-weight LLMs for a concrete task (which model to deploy, at what settings)
requires running candidate models on *representative* prompts — which, in regulated
settings, are exactly the prompts that cannot be sent to a third party. Three facts make
this binding:

1. **Data residency / compliance.** Healthcare, finance, legal, and government workflows
   restrict transmitting source data (PHI/PII, privileged documents) to external services.
2. **Reproducibility.** Hosted endpoints change model versions and decoding behavior
   without notice; a comparison run today may not be reproducible next quarter.
3. **Cost and access.** Per-token API fees and rate limits accumulate during the
   many-prompt × many-model sweeps that evaluation actually requires.

A useful evaluation tool for these settings must therefore (a) keep data on the machine
by default, (b) pin and record the exact models and decoding parameters, and (c) produce
exportable artifacts that can be re-run and audited.

## 2. Why existing approaches fall short (for this setting)

- **Crowdsourced public arenas** (e.g., LMSYS Chatbot Arena; Chiang et al.) produce
  high-quality *population-level* rankings from pairwise human votes aggregated with a
  Bradley–Terry / Elo model. They are designed for public models and public prompts; they
  cannot evaluate a model on a user's private dataset, and the ranking reflects the
  crowd's tasks, not the user's.
- **Automatic LLM-judge harnesses** (e.g., MT-Bench / "LLM-as-a-judge", Zheng et al.;
  AlpacaEval; G-Eval, Liu et al.) established that a strong model can score answers with
  meaningful human agreement, but also documented systematic judge biases — **position**,
  **verbosity**, and **self-enhancement** (a judge favoring its own family's outputs).
  Most reference implementations assume a hosted judge and a hosted candidate API.
- **Ad-hoc local comparison UIs** show outputs side by side but stop at eyeballing: no
  bias controls, no aggregation, no exportable record.

Local LLM Arena's contribution is to combine the *local-first* execution model with the
*methodology* (blind controls + judge + pairwise aggregation + reproducible export) in one
tool, so private evaluation produces an auditable result rather than an impression.

## 3. System architecture

```
Browser (React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui)
   │  fetch + NDJSON stream  (same-origin /api/*)
   ▼
FastAPI (async, Pydantic-validated)   ── ollama-python AsyncClient ──▶  Ollama (localhost:11434)
                                          │
   cloud judge (opt-in, per-request key) ─┴──▶  Anthropic SDK · OpenAI-compatible HTTP (OpenRouter, …)
```

- **Single source of truth, async.** One FastAPI backend handles all model I/O via the
  async `ollama` client; per-model requests fan out with `asyncio`, not a thread per
  model (`backend/app/services/ollama.py`, `backend/app/routers/chat.py`).
- **One generation per model on the streaming path.** `/api/chat/stream` consumes a single
  Ollama stream per model and assembles the final text from the same token stream it
  reports — there is no second, separately-sampled generation, so the text shown equals
  the text recorded (`backend/app/routers/chat.py`).
- **Validated inputs.** Hyperparameters are Pydantic-bounded
  (`temperature∈[0.01,2.0]`, `top_p∈[0,1]`, `top_k∈[0,100]`, `repeat_penalty∈[1.0,2.0]`,
  `num_predict∈[-1,4096]`, `seed≥0`), so out-of-range inputs are rejected with HTTP `422`
  rather than failing mid-generation (`backend/app/schemas.py`).
- **Local by default; same-origin in production.** The built SPA is served by the same
  FastAPI process (`backend/app/main.py`), so the browser calls `/api/*` same-origin. A
  request-origin guard limits state-changing routes (model pull/delete) to local origins
  (`backend/app/security.py`).
- **Reachability:** `ollama-python` `AsyncClient` against `http://127.0.0.1:11434`;
  Docker variant reaches the host via `host.docker.internal`.

### 3.1 API surface (reference)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | liveness + `ollama_reachable` |
| GET | `/api/models` | installed models (name, size, family, params) |
| POST | `/api/chat` | non-streaming parallel generation (used by batch) |
| POST | `/api/chat/stream` | NDJSON token stream, one generation per model |
| POST | `/api/judge` | LLM-as-judge over anonymized candidates |
| POST | `/api/models/pull` · DELETE `/api/models/{name}` | model management |

## 4. Evaluation methodology

### 4.1 Per-model metrics

For each generation the backend records, from Ollama's own counters, `eval_tokens`
(`eval_count`), `duration_s` (`eval_duration` in nanoseconds ÷ 1e9), `tokens_per_sec`
(`eval_count / duration_s`), and `first_token_s` (time to first token). These are
*operational* metrics (throughput/latency), not quality (`backend/app/routers/chat.py`,
`_metrics`).

### 4.2 Blind evaluation (human-vote bias control)

To collect unbiased human preference, the UI can hide model identity:

- Model identities are replaced with anonymous labels (`Model A/B/C…`) and the **display
  order is randomized** per comparison (Fisher–Yates), addressing **identity bias** and
  **position bias** in the human rater (`frontend/src/store/arena.ts`, `computeBlind`).
- Raters apply 👍/👎 per answer; votes are recorded per (turn, model).
- **Reveal locks voting.** After identities are revealed, further voting is disabled to
  prevent post-hoc revision (`reveal`/`vote` in `arena.ts`).
- Exports performed before reveal carry masked labels (a `_blind` filename suffix); the
  full mapping is only included after reveal.

### 4.3 LLM-as-judge (automated scoring)

A chosen model scores the answers. Two bias controls are built into the request:

1. **Anonymization.** Candidates are presented to the judge as `[A] … [B] …` with no model
   names, mitigating self-enhancement and brand bias
   (`frontend/src/store/arena.ts`/`benchmark.ts` build candidates as letters/blind labels).
2. **Structured output.** The judge is constrained to a JSON schema so the result is
   machine-parseable across models.

System instruction and required output schema (verbatim, `backend/app/routers/judge.py`):

```
System: "You are an impartial expert evaluator of AI assistant answers. Judge only on
accuracy, helpfulness, and clarity. Ignore length, tone, and which system produced each
answer. Be objective and concise."
```

```json
{
  "type": "object",
  "properties": {
    "verdicts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "label":  {"type": "string"},
          "score":  {"type": "number"},
          "reason": {"type": "string"}
        },
        "required": ["label", "score", "reason"],
        "additionalProperties": false
      }
    },
    "winner": {"type": "string"}
  },
  "required": ["verdicts", "winner"],
  "additionalProperties": false
}
```

**Providers and how structure is enforced:**

| Provider | Transport | Structured-output mechanism |
|---|---|---|
| Local (Ollama) | `ollama-python` | `format=<schema>` constrained decoding |
| OpenAI-compatible (incl. OpenRouter) | HTTPS `/chat/completions` | `response_format: {type:"json_schema", strict:true}` |
| Anthropic (Claude) | official `anthropic` SDK | schema embedded in the prompt; parsed + validated |

The raw JSON is parsed, defensively coerced (e.g., a list-shaped verdict `["A",9,"…"]` is
repaired to an object; scores are clamped to `[0,10]`), validated against a Pydantic model,
and the `winner` is recomputed from the highest valid score if the model omitted or
mismatched it. If no usable verdict is produced, the endpoint returns `502` with a message
recommending a more capable judge — the framework never invents a verdict
(`_coerce`, winner-fallback, `backend/app/routers/judge.py`). API keys are resolved
per-request (UI value, else environment variable), never persisted server-side and never
logged.

### 4.4 Pairwise Elo aggregation

Per-turn signals are converted to **pairwise matches** and rated with a standard Elo
update (`frontend/src/lib/elo.ts`). Exact procedure:

- Initial rating `R₀ = 1000`; update constant `K = 24`.
- Expected score `E_A = 1 / (1 + 10^((R_B − R_A)/400))`.
- **Signal per turn:** if the turn was auto-judged, the judge's per-model scores are the
  signal; otherwise human 👍/👎 votes are the signal.
- For each unordered pair (A,B) present in the turn: result is `1` if A's signal > B's,
  `0` if <, `0.5` if equal; both ratings updated by `K·(result − E)`.
- Turns are processed in **chronological order**; models are **aggregated by name** (the
  same model at different decoding parameters shares a rating row).

```ts
// frontend/src/lib/elo.ts (core update)
const expected = (a, b) => 1 / (1 + 10 ** ((b - a) / 400));
elo.set(ma, ra + K * (res - ea));
elo.set(mb, rb + K * (1 - res - (1 - ea)));   // K = 24, R0 = 1000
```

The output is a ranked table of `{model, elo, wins, losses, ties, matches}`. This is the
same Bradley–Terry-family pairwise approach used by public arenas, applied to *your*
prompts and judged *locally*.

### 4.5 Batch benchmarking (the reproducible run)

A benchmark takes a prompt set and, for each prompt, calls non-streaming `/api/chat`
(all models in parallel), then `/api/judge` on the anonymized answers, then feeds the
collected judgments into §4.4 to produce a leaderboard
(`frontend/src/lib/benchmark.ts`, `runBenchmark`). Results export as Markdown (a human
report) or JSON (machine-readable: every prompt, every model's answer, every verdict and
score, plus the aggregate leaderboard).

## 5. Implementation & verification (evidence the system does what it claims)

- **Tests.** Backend `pytest` (9 cases) covers health (offline-safe), parameter bounds →
  `422`, all-six-hyperparameter passthrough, judge validation, and cloud-key-missing →
  `400`. Frontend `vitest` (8 cases) covers instance-id determinism, the NDJSON stream
  parser across chunk boundaries, the Elo update (judged-winner ranks higher; votes-only
  fallback), and the benchmark aggregation + Markdown emitter.
- **CI/CD.** GitHub Actions runs `ruff` + `pytest` and `tsc` + `vitest` + build on push/PR.
- **Packaging.** One-command launcher (`start.ps1`/`start.sh`) and a multi-stage Docker
  image that serves the SPA + API as one process and reaches host Ollama.

## 6. Reproducibility protocol

Anyone can reproduce a benchmark run and obtain the exact artifact:

1. **Environment.** Install [Ollama](https://ollama.com); pull the candidate models
   (e.g., `ollama pull gemma3:1b qwen2.5:3b llama3.2:3b`). Run the app (`./start.ps1` /
   `./start.sh`) → `http://127.0.0.1:7860`.
2. **Pin candidates.** Add each model to the arena; record exact tags and decoding
   parameters (the deterministic instance id is
   `model__{temp}_{top_p}_{top_k}_{repeat}_{predict}_{seed}`).
3. **Fix the judge.** In **🧪 Benchmark → judge settings**, select a *capable* judge
   (cloud models follow the schema most reliably; see §7) and record provider + model.
4. **Provide the prompt set.** Paste or load `.txt`/`.jsonl`/`.csv` (one prompt per line;
   `.jsonl` uses the `prompt`/`question`/`input` field).
5. **Run** and **export JSON**. The JSON contains, for the full run: the model list, the
   judge label, and per prompt — each model's answer, the judge's per-candidate
   `{label, score, reason}`, the winner, and the aggregate Elo leaderboard.

**Export record schema (abridged, `frontend/src/lib/benchmark.ts`):**

```jsonc
{
  "app": "Local LLM Arena", "kind": "benchmark", "generatedAt": "<ISO-8601>",
  "judge": "<provider · model>", "models": ["<tag>", "..."],
  "leaderboard": [{ "model": "...", "elo": 0, "wins": 0, "losses": 0, "ties": 0, "matches": 0 }],
  "results": [{
    "prompt": "...",
    "answers": { "<instanceId>": { "model": "...", "text": "..." } },
    "verdicts": [{ "label": "A", "score": 0, "reason": "..." }],
    "winner": "A", "mapping": { "A": "<instanceId>" }
  }]
}
```

Two runs with the *same* prompt set, candidate set, and judge are directly comparable; the
JSON is the unit of reproducibility and review.

## 7. Limitations and threats to validity

This section is deliberate: the method has real constraints, and overstating it would
defeat the purpose.

- **The judge is a model.** Automated scores inherit LLM-judge biases documented in the
  literature (position, verbosity, self-enhancement; Zheng et al.). The framework
  mitigates *position* and *identity* bias by anonymizing and randomizing candidate
  presentation, but **family/self-enhancement bias is not eliminated** — a judge may favor
  outputs stylistically similar to its own family. Mitigation in practice: use a judge
  outside the candidates' family, and corroborate with the blind human-vote mode.
- **Small judges are unreliable.** Empirically, sub-2B local models frequently fail to
  emit ≥2 well-formed verdicts even under constrained decoding, yielding no usable pairwise
  signal (the system surfaces this rather than fabricating a result). A dependable judge in
  this framework is a mid-/large model (local 7B+ or a cloud model).
- **Elo is order- and K-dependent.** Ratings depend on match order and the `K=24` step
  size; with few matches the absolute numbers are noisy. Treat small-sample Elo as ordinal
  and report `matches` alongside it (the leaderboard does). Win-rate from the same pairwise
  record is an order-independent alternative.
- **Single annotator (human mode).** 👍/👎 votes are one rater's preference; no
  inter-annotator agreement is computed. Human-vote leaderboards are personal, not
  population-level.
- **No large-scale results are claimed here.** This report intentionally presents the
  method and protocol, not a ranking. A results paper requires a fixed prompt set of
  meaningful size, ≥3 candidate models, a capable judge, and ideally a human-agreement
  spot-check — produced via §6.
- **Decoding nondeterminism.** Unless `seed` is set, generations vary run to run; pin seeds
  for strict reproducibility (the framework supports per-model `seed`).

## 8. Related work

- **Chatbot Arena** (Chiang et al.) — crowdsourced pairwise human votes aggregated with a
  Bradley–Terry/Elo model; the canonical reference for pairwise LLM ranking. Local LLM
  Arena applies the same aggregation locally and on user-supplied prompts.
- **MT-Bench / "Judging LLM-as-a-Judge"** (Zheng et al.) — established LLM-as-judge as a
  scalable proxy for human preference and catalogued its biases; motivates this report's
  anonymization/randomization controls and the "use a strong, non-family judge" guidance.
- **AlpacaEval; G-Eval** (Liu et al.) — automatic LLM-judge evaluation pipelines; this work
  differs by being local-first and by unifying judge scoring with human blind voting and a
  reproducible export.
- **Bradley & Terry (1952); Elo rating system** — the statistical/rating basis for §4.4.

## 9. Conclusion

Local LLM Arena packages an evaluation *methodology* — blind human voting with bias
controls, anonymized structured LLM-as-judge scoring, pairwise-Elo aggregation, and
reproducible batch export — inside a local-first system, so that teams who cannot use cloud
arenas can still produce auditable, repeatable model evaluations on their own data and
hardware. The framework is open source (MIT). The natural next step is an empirical study,
executed with the protocol in §6, contributing private-data model-selection results that
public arenas structurally cannot.
