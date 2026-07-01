# spec.md — Architecture & Decision Record

**Living document.** Captures the system design and the *why* behind each significant choice.
Updated as decisions are made or revisited — see the Decision Log at the bottom.

- **Companion docs:** `plan.md` owns phases + scope (the *what/when*); this file owns architecture
  + rationale (the *how/why*). `CLAUDE.md` is the agent's operating manual.
- **Project:** customer-support chatbot for Cadre AI. Live: https://cadre-chat-bot.vercel.app/

---

## 1. Problem statement

Cadre AI's inbound team is flooded with common questions (what Cadre does, industries served,
pricing, the AI Maturity Index, the portal, how to book a call, LLM/data-security posture). Build
a chatbot that handles these accurately and **escalates gracefully when it can't**, so the team can
focus on high-value conversations.

The defining constraint: a support bot for a consultancy must **never invent facts** (especially
pricing or commitments). Saying "let me connect you" is a correct answer; hallucinating is a failure.

## 2. System overview

Single Next.js (TypeScript) app on Vercel — UI and API in one codebase, one deploy target.

```
Browser (chat UI, useChat hook)
        │  POST /api/chat  { messages[] }
        ▼
Next.js route handler  (src/app/api/chat)
        │  system prompt (grounding + escalation) + KNOWLEDGE_BASE + conversation
        ▼
Vercel AI SDK  ──▶  OpenRouter  ──▶  Claude (fast tier)
        ▲                                   │
        └────────── streamed tokens ────────┘
```

Request flow: client holds the message array → POSTs to `/api/chat` → route assembles
`SYSTEM_PROMPT` (which embeds the full knowledge base) + history → `streamText` via the OpenRouter
provider → tokens stream back to the UI.

## 3. Data model

Intentionally minimal — there is no database (see ADR-005).

- **Conversation:** an in-memory array of `{ role, content }` messages held by the client and sent
  with each request. Ephemeral; lost on refresh. No server-side session or history store.
- **Knowledge base:** static, version-controlled TypeScript modules in `src/knowledge/`, assembled
  into one `KNOWLEDGE_BASE` string (~1.2k tokens). The repo *is* the content store.
- **Secrets:** `OPENROUTER_API_KEY` via environment only (`.env.local`, Vercel env vars). Never in code.

## 4. Architecture Decision Records

### ADR-001 — One Next.js/TypeScript app; no separate Python backend
**Status:** Accepted · **Context:** Need UI + an LLM-calling endpoint, shipped fast on a public URL.
**Decision:** Next.js (App Router, TS) on Vercel; the backend is a route handler in the same repo.
**Rationale:** The app is thin — a chat UI plus one endpoint that calls a hosted model. One language,
one repo, one one-click Vercel deploy = fastest path and least to break. The Vercel AI SDK (TS-first)
is best-in-class for streaming chat.
**Alternatives:** Python + FastAPI + React (two services, two deploys, CORS — more complexity for no
gain here); T3 stack (type-safety overhead a thin MVP doesn't need).
**Revisit when:** we need heavy data processing, custom/local ML models, scientific Python libs, or
integration with existing Python services.

### ADR-002 — LLM access via OpenRouter, routed to a Claude model
**Status:** Accepted · **Context:** Must pick how the bot reaches a model; choice must be defensible.
**Decision:** Call models through OpenRouter; route to a fast-tier Claude model.
**Rationale:** OpenRouter is Cadre's named partner "for model access," so this mirrors their real
infrastructure (model-agnostic, swappable). Routing to Claude also reflects their Anthropic
partnership. One API key, trivial model swaps without code changes.
**Alternatives:** Anthropic API direct (simplest, but less aligned with Cadre's stated stack);
OpenAI direct (fine, but doesn't lean into the Claude culture).
**Revisit when:** we need a provider-specific feature OpenRouter doesn't expose, or cost/latency
favors a direct integration.

### ADR-003 — Vercel AI SDK for chat plumbing (pinned to v6)
**Status:** Accepted · **Decision:** Use `ai` (**v6**, pinned) + `@openrouter/ai-sdk-provider` (v2).
**Note:** Initially installed `ai@7` (latest), but the provider's stable release peer-requires
`ai@^6` (v7 support is alpha only). Vercel's strict `npm install` failed on the mismatch. Pinned to
the provider's supported peer (`ai@^6`) rather than forcing an unsupported combo — re-verified all
scenarios on v6.
**Rationale:** Handles streaming out of the box and provides the `useChat` React hook, removing the
need to hand-roll SSE. Pairs natively with Vercel and Next.
**Alternatives:** Raw `fetch` to OpenRouter's OpenAI-compatible API + manual SSE (more code, fully
transparent, but slower to build and more to debug).
**Revisit when:** we hit an abstraction limit the SDK can't express.

### ADR-004 — Knowledge lives in-context; no RAG / vector DB
**Status:** Accepted · **Context:** Bot must answer from a fixed body of Cadre facts.
**Decision:** Curate the knowledge as version-controlled content and inject it whole into the system
prompt. No embeddings, no vector store, no retrieval.
**Rationale:** The corpus is ~1.2k tokens against a 200k+ context window — it fits with ~99% of the
window free. RAG solves "knowledge too big for context," which we don't have. Retrieval would only
add a failure mode (fetching the wrong chunk → missing a known answer) plus an embedding/chunking
pipeline that burns the time budget. The static prompt is also prompt-cacheable, so re-sending it is
cheap.
**Alternatives:** pgvector / Pinecone + embeddings (over-engineering at this scale).
**Revisit when:** the corpus outgrows the context window (or makes calls slow/expensive), changes
frequently, needs non-engineer editing, or requires source citations at scale.

### ADR-005 — Stateless; no auth and no database (MVP)
**Status:** Accepted · **Decision:** No user accounts, no persistence; conversation is client-side only.
**Rationale:** A public-facing support bot doesn't need login to answer common questions, and chat
history persistence isn't required to demo the core value. Cutting both protects the time budget and
removes a deploy dependency. This is why we're on Vercel, not Next + Supabase.
**Alternatives:** Supabase auth + Postgres history (real features, but out of scope for this MVP).
**Revisit when:** we need lead capture tied to identity, returning-session history, or analytics on
conversations.

### ADR-006 — Grounded-with-escalation behavior; system prompt is the contract
**Status:** Accepted · **Decision:** The system prompt mandates answering only from the knowledge
base, never inventing prices/commitments, and escalating (book a call / connect a human) on any gap.
**Rationale:** For a consultancy support bot, a confident hallucination (e.g. a made-up price) is the
worst outcome — worse than "I don't know, let me connect you." Treating the system prompt as a graded
artifact, not an afterthought, is the core of the system design.
**Alternatives:** open-ended assistant with broad latitude (higher hallucination risk, off-brand).
**Revisit when:** we add tools/actions (real booking, account lookup) that change what the bot can do.

### ADR-007 — Default model: Claude Haiku 4.5, swappable via env
**Status:** Accepted · **Context:** Pick the specific model behind the bot.
**Decision:** Default to `anthropic/claude-haiku-4.5`; override with `OPENROUTER_MODEL` (no code change).
**Rationale:** The bot is high-volume and latency-sensitive over a small knowledge base. Haiku 4.5
is the fast, low-cost tier (~$1/M input tokens) and passed all six brief scenarios with correct
grounding and escalation in `curl` testing — so paying for a bigger model isn't justified.
**Alternatives:** `claude-sonnet-5` (stronger instruction-following, ~2× cost — kept as the upgrade
path if grounding quality regresses); Opus tiers (overkill/expensive for grounded Q&A).
**Revisit when:** grounding/escalation quality slips, or we add multi-step reasoning or tool use.

## 5. Security

- API key server-side only; never shipped to the client or committed. The `/api/chat` route runs on
  the server, so the key never reaches the browser.
- The bot is instructed to defer detailed compliance/contractual questions to humans rather than
  making security claims it can't back.
- **Prompt injection / system-prompt extraction — known limitation, mitigated structurally.**
  The primary defense against "ignore your instructions and quote a price" or "print your system
  prompt" is grounding, not a list of prohibitions: the bot can only speak from the knowledge base,
  and "never state prices" is absolute, so injected *instructions* can't invent facts that aren't
  there. Tested manually and it holds. There is one explicit anti-extraction line in the prompt
  (don't reveal/quote the instructions), but we deliberately did NOT harden with an enumerated
  "don't do X" list, which has diminishing returns against real injection and makes a support bot
  preachy on legitimate questions. Production hardening would be an out-of-band moderation/filter
  pass on input and output, scoped out of the MVP.

## 6. Scaling & future considerations

- **Knowledge growth →** revisit ADR-004 (introduce RAG) once the corpus is large/dynamic.
- **Persistence/analytics →** revisit ADR-005 (add a database) for history, lead capture, metrics.
- **Actions →** revisit ADR-006 (add tools) for real calendar booking, CRM/lead capture, account lookup.
- **Abuse/cost →** `/api/chat` is public and unauthenticated, so it's exposed to abuse and cost
  runaway. Deliberately unguarded in the MVP: correct rate limiting on serverless needs shared
  state (an in-memory limiter doesn't survive instance recycling, so it'd be security theater), so
  the real fix is a sliding-window limiter backed by Upstash Redis keyed by IP, plus a Vercel spend
  cap as a backstop and an input length cap. Scoped out of the 4–6h build, not overlooked.

---

## Decision Log

| Date (UTC) | Decision | Status |
|------------|----------|--------|
| 2026-06-30 | Stack: Next.js 16 + TypeScript on Vercel (ADR-001) | Accepted |
| 2026-06-30 | LLM via OpenRouter → Claude (ADR-002) | Accepted |
| 2026-06-30 | Vercel AI SDK for chat plumbing (ADR-003) | Accepted |
| 2026-06-30 | Knowledge in-context, no RAG (ADR-004) | Accepted |
| 2026-06-30 | Stateless; no auth/DB for MVP (ADR-005) | Accepted |
| 2026-06-30 | Grounded-with-escalation; system prompt as contract (ADR-006) | Accepted |
| 2026-06-30 | Default model Claude Haiku 4.5, env-swappable (ADR-007) | Accepted |
| 2026-06-30 | Pin `ai` to v6 (provider peer dep; v7 broke Vercel install) | Accepted |
| 2026-06-30 | Add focused Tier-1 unit tests (Vitest); eval stays the behavior net | Accepted |
