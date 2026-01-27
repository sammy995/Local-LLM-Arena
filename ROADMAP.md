# Ollama Arena — Development Roadmap

## Vision

Transform Ollama Arena from a **personal evaluation tool** into a **production-ready, collaborative LLM evaluation platform** while maintaining its privacy-first, local-first principles.

---

## Phase 1: Stability & Usability (Q1 2026)

**Goal**: Fix critical UX issues and performance bottlenecks for single-user workflows.

### Tasks
- [ ] **localStorage memory leak fix**
  - Implement session pagination (max 50 messages per view)
  - Add archive/delete old sessions functionality
  - Warn user when approaching 10MB localStorage limit

- [ ] **Model download progress UI**
  - Add SSE streaming from Ollama API during `ollama pull`
  - Show progress bar with percentage, ETA, download speed
  - Handle network interruptions gracefully

- [ ] **Responsive CSS for mobile**
  - Bootstrap grid system refactor for tablets (768px-1024px)
  - Mobile-first layout for phones (<768px)
  - Touch-friendly controls (larger buttons, swipe gestures)

- [ ] **Improved error messages**
  - Replace developer jargon with user-friendly explanations
  - Add "What went wrong" + "How to fix" format
  - Link to troubleshooting docs for common issues

- [ ] **Keyboard shortcuts**
  - `Ctrl+Enter` to send message
  - `Esc` to cancel streaming
  - `Ctrl+K` to focus model selector
  - `Ctrl+E` to export conversation

### Success Metrics
- Zero localStorage quota errors in typical use (50+ sessions)
- <5 seconds to load app on slow connections
- Mobile usability score >80 (Lighthouse)
- Error resolution time <30 seconds (self-service)

---

## Phase 2: Data Persistence (Q2 2026)

**Goal**: Enable cross-device sync, team sharing, and import/export flexibility.

### Tasks
- [ ] **Backend SQLite database**
  - Schema: `users`, `sessions`, `messages`, `votes`, `prompts`
  - Migration from localStorage (one-time import)
  - Automatic backups (daily, weekly retention)

- [ ] **Import/export full workspace**
  - Export all sessions + votes + prompts as single ZIP file
  - Import from JSON (validate schema, merge with existing)
  - Support for partial export (date range, specific models)

- [ ] **Session resume after server restart**
  - Persist active session ID in cookie
  - Restore UI state on reconnect
  - Handle concurrent edits (last-write-wins for now)

- [ ] **Multi-format export**
  - **CSV**: Prompt, Model, Response, Timestamp, Vote (for Excel analysis)
  - **Markdown**: Formatted conversation with code blocks (for documentation)
  - **PDF**: Professional report with charts (requires WeasyPrint)

### Success Metrics
- 100% data preservation across server restarts
- Export formats open in Excel/Word/Adobe with no errors
- <10 seconds to export 1000 messages (any format)

---

## Phase 3: Evaluation Scale (Q2-Q3 2026)

**Goal**: Support batch evaluation, automated metrics, and systematic comparison.

### Tasks
- [ ] **Batch evaluation**
  - CSV upload: `prompt, model1, model2, ...` (up to 1000 rows)
  - Background job processing (Celery + Redis)
  - Progress tracking UI (% complete, ETA, cancel)
  - Results table with sortable columns (time, tokens, votes)

- [ ] **Automated metrics**
  - Integrate LangChain evaluators (relevance, coherence, groundedness)
  - Optional OpenAI-based metrics (requires API key, user opt-in)
  - BLEU, ROUGE, BERTScore for text similarity
  - Perplexity calculation (requires model access)

- [ ] **Comparison reports**
  - Model A vs. B: win/loss/tie matrix across N prompts
  - Aggregated metrics: mean, median, std dev
  - Statistical significance tests (t-test, Mann-Whitney U)
  - Exportable charts (matplotlib → PNG/PDF)

- [ ] **Time-series tracking**
  - Store model version + timestamp for each response
  - Trend analysis: "Has llama3.2 improved over 3 months?"
  - Alert on performance regression (configurable threshold)

### Success Metrics
- Process 100 prompts × 4 models in <10 minutes
- Automated metrics match human judgment 70%+ of time
- Reports generate in <30 seconds

---

## Phase 4: Collaboration (Q3 2026)

**Goal**: Enable team evaluation, consensus voting, and shared workspaces.

### Tasks
- [ ] **Multi-user support**
  - User authentication (Flask-Login, bcrypt password hashing)
  - User roles: Admin, Member, Viewer
  - SQLite backend for user accounts (upgrade to PostgreSQL later)

- [ ] **Shared workspaces**
  - Create workspace → invite team members → shared sessions
  - Permissions: view-only, comment-only, full edit
  - Workspace-level settings (models, system prompt, voting rules)

- [ ] **Real-time collaboration**
  - WebSocket for live updates (Flask-SocketIO)
  - See who's online, what they're typing (cursor position)
  - Conflict resolution: lock editing during active session

- [ ] **Comments/annotations**
  - Add inline comments to specific model responses
  - Thread replies for discussion
  - Resolve/archive comments when addressed

- [ ] **Consensus voting**
  - Aggregate team votes (5 members vote → majority wins)
  - Weighted voting (experts get 2x weight)
  - Export consensus report (for stakeholder presentation)

### Success Metrics
- 10 users collaborate on same workspace without lag
- Consensus voting reduces evaluation time 50% vs. sequential review
- Zero data loss during concurrent edits

---

## Phase 5: Advanced Features (Q4 2026)

**Goal**: Support power users, researchers, and enterprise deployments.

### Tasks
- [ ] **Blind testing mode**
  - Toggle "🎭 Blind Mode" → models anonymized as A/B/C/D
  - Shuffle order randomly (prevents position bias)
  - Reveal identities after voting

- [ ] **Custom model upload**
  - Upload GGUF file → auto-create Ollama Modelfile
  - Visual Modelfile editor (FROM, SYSTEM, PARAMETER)
  - Test custom model before adding to registry

- [ ] **Fine-tuning integration**
  - Compare base model vs. fine-tuned version
  - Side-by-side diff view (highlight changed responses)
  - Metrics: improvement %, regression count

- [ ] **API access**
  - REST API for programmatic evaluation
  - Python SDK: `ollama_arena.evaluate(prompts, models)`
  - Rate limiting (100 requests/min per API key)

- [ ] **Plugins/extensions**
  - Plugin system (Python decorators: `@ollama_arena.metric`)
  - Custom metrics (domain-specific scoring functions)
  - Integrations: Slack (notify on completion), Jira (create tickets for regressions)

### Success Metrics
- Blind mode eliminates brand bias (validated via A/B test)
- API used by 10+ external projects
- 5+ community-contributed plugins

---

## Long-Term Vision (2027+)

- **Enterprise Edition**: On-premise deployment, SSO, compliance reports
- **Cloud-Hosted Option**: Managed service (privacy-preserving, E2E encrypted)
- **Model Marketplace**: Share fine-tuned models with community
- **Agentic Evaluation**: Auto-generate test cases, detect regressions

---

## How to Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

**Priority areas for community contributions:**
1. Automated metrics (Phase 3)
2. Multi-format export (Phase 2)
3. Mobile CSS (Phase 1)
4. Plugin examples (Phase 5)

---

**Maintained by**: Shubham Lagad  
**Last updated**: January 2026  
**Status**: Phase 1 in progress (50% complete)
