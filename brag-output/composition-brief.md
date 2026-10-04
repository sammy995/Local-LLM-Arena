# Hyperframes Composition Brief: Local LLM Arena

## Objective
Create a short launch-style brag video for Local LLM Arena.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source Material
- Project root: `E:\AI learning\LocalLLMArena`
- Primary files: `frontend/src/index.css`, `frontend/src/components/arena/ComparisonView.tsx`, `frontend/src/components/arena/ArenaCard.tsx`
- Product name: Local LLM Arena
- Tagline / strongest claim: Compare local models on one prompt
- Key UI: empty-state headline, model chips, three response cards, FAST crown
- Copy that must appear verbatim:
  - Compare local models on one prompt
  - Compare, score, choose
  - Local LLM Arena

## Creative Direction
- Tone preset: polished
- Creative direction: industrial forge, restrained, product-first
- Interpretation: slow readable type, one ember accent, no SaaS gradients
- Angle: one prompt, three local models, fastest wins the crown
- Hook: Chat UIs talk to one model.
- Outro / punchline: Compare. Score. Choose.
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign

## Visual Identity
- Background: oklch(0.178 0.008 65)
- Text: oklch(0.922 0.008 80)
- Accent: oklch(0.74 0.19 55) ember
- Display font: Bricolage Grotesque Variable (local woff2)
- Body font: Hanken Grotesk Variable (local woff2)
- Visual references: ArenaCard, FAST crown, chip pills, prompt bubble

## Storyboard
Use `brag-output/brag-plan.md`.

Scene summary:
1. Hook — 3.27s — cream hook line
2. Name — 3.82s — product name + empty-state copy
3. Arena — 8.20s — three cards + FAST
4. Lock — 4.71s — on-machine claim + wordmark at 17.47s

## Audio
- Audio role: warm bed
- Audio arc: fade in 0.4s, hold, fade under logo last 1.2s
- Music: happy-beats-business-moves-vol-12-by-ende-dot-app.mp3
- Music treatment: data-volume 0.12, polished
- Music cue guidance: bundled vol-12 cues; optional lock 17.47
- Audio-reactive treatment: subtle ember glow only
- Audio-coupled moments:
  - 8.74 first card
  - 13.11 FAST crown
  - 17.47 wordmark
- SFX: click_003, drop_002, bong_001, impactSoft_heavy_000
- Exact SFX choice: implemented with the animation
- Audio files: copied into `composition/assets/`

## Hyperframes Instructions
Native HyperFrames GSAP paused timeline, seek-safe fromTo, local fonts, WCAG AA. Skip intent interview.
