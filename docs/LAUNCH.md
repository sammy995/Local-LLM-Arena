# Launch kit

Copy-paste assets for launching Local LLM Arena. Audience = developers and ML
practitioners, so the primary channels are **Hacker News, GitHub, and X**, with
Reddit and awesome-lists as support. Launch as a *campaign* (a week), not a single day.

## One-line positioning

> For ML practitioners who evaluate local models on private data, **Local LLM Arena**
> is a local evaluation harness that puts your Ollama models in a blind, judged,
> Elo-ranked arena — **unlike** cloud Chatbot Arena, nothing ever leaves your machine.

## Show HN

**Title** (≤ 80 chars, no "Show HN:" emoji, no hype words):

```
Show HN: Local LLM Arena – a private Chatbot Arena for your Ollama models
```

**Body:**

```
I kept comparing local models by hand — same prompt, two terminals, eyeballing which
answer was better. It doesn't scale and it's biased (you know which model is which).

Local LLM Arena sends one prompt to up to 6 local models at once and streams the
answers side by side. The point is evaluation, not chat:

- Blind mode hides model names and randomizes order, so you vote on quality alone,
  then reveal who was who.
- An optional LLM-as-judge scores the anonymized answers and picks a winner — using a
  local model, or a cloud model with your own API key.
- Votes and judgments roll up into a private Elo leaderboard across all your runs.
- A batch mode runs a whole prompt set across models and exports a reproducible Elo
  report (Markdown/JSON).

It's 100% local — FastAPI + React talking to Ollama, no accounts, no telemetry, fonts
bundled offline. One command to run (start.ps1 / start.sh) or `docker compose up`.

Stack and the why-rewrite story are in the README. Honest about limits: judge bias and
small-sample Elo noise are documented in docs/TECHNICAL_REPORT.md. Feedback welcome,
especially on the judging methodology.

Repo: https://github.com/sammy995/Local-LLM-Arena
```

**HN tips:** post Tue–Thu ~8–10am ET. Reply to every comment in the first 2 hours.
Don't ask for upvotes. Lead with the problem, not the tech.

## Product Hunt

- **Tagline (≤ 60 chars):** `A private Chatbot Arena for your local LLMs`
- **First comment:** the Show HN body, trimmed, plus a 15-sec GIF (use `docs/assets/demo-compare.gif`).

## X / Bluesky thread

1. I built a private Chatbot Arena that runs entirely on your machine. One prompt →
   6 local models answer side by side, live. 🧵 [demo GIF]
2. Blind mode hides the names so you vote on quality, not reputation. Reveal shows who
   won. [blind GIF]
3. An LLM judge scores the anonymized answers (local model, or your own cloud key) and
   it all rolls into a private Elo leaderboard.
4. Batch mode runs a prompt set across models and exports a reproducible report.
   100% local, MIT, FastAPI + React + Ollama. Repo 👇

## Reddit / communities

Target: r/LocalLLaMA, r/ollama, r/MachineLearning (Saturday "what are you working on").
Lead with the methodology, not the launch. r/LocalLLaMA rewards substance — share a real
benchmark result from the tool and link the repo as context, not as the headline.

## Awesome-lists (open a PR adding the repo)

- `awesome-ollama`
- `awesome-local-ai` / `awesome-llm`
- `awesome-llmops` (eval/observability section)

## Activation = the "aha"

A visitor's aha is **seeing two models answer the same prompt side by side and voting
blind.** Lower the friction to that moment: the README's first GIF must show it, and the
empty arena should prompt the user to run a comparison immediately. Track repo visits →
clones → stars; double down on whichever channel yields real usage, not just upvotes.
