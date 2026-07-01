# plan.md — Cadre AI Support Chatbot

The build plan and, just as importantly, **what we deliberately are not building**. Scope is a
graded decision here; this file makes those calls explicit.

## Goal

Ship a deployed, grounded customer-support chatbot for Cadre AI that handles the most common
inbound questions and escalates gracefully when it can't. Quality and judgment over feature count.
Target: a focused MVP in ~4–6 hours.

## Architecture (overview)

- **Next.js App Router** app, one repo. A chat page (`/`) talks to a server route (`/api/chat`).
- `/api/chat` builds a prompt = **system prompt + curated knowledge + conversation** and calls
  **OpenRouter** (Claude model). Streams the response back.
- **Knowledge as curated content in the repo, NOT a vector DB.** Cadre's knowledge corpus is small
  and bounded (services, industries, pricing posture, AI Maturity Index, portal, booking, LLM/data-
  security stance). It fits comfortably in context. A vector store / RAG pipeline would be
  over-engineering for this size and would burn our time budget.
  - **When I'd add RAG:** once the knowledge base outgrows the context window or needs frequent,
    non-engineer updates. Documented as a scaling trade-off, not built now.

### Model choice rationale
A support bot is high-volume, latency-sensitive, over bounded knowledge → a **fast mid-tier Claude
model** (e.g. Sonnet/Haiku class) is the right cost/quality trade-off, not the largest model.
Pinned during Phase 2; swappable because we go through OpenRouter.

## Scope — explicit decisions

### ✅ In scope (the MVP)
- Single-page chat UI (clean, responsive, streaming responses).
- `/api/chat` server route → OpenRouter (Claude), grounded by system prompt + knowledge base.
- Curated knowledge base covering the brief's scenarios:
  - What Cadre does + which industries it serves
  - How to book a call with an AI strategist (clear CTA)
  - How to access the Cadre portal
  - What the AI Maturity Index is + how to get scored
  - Cadre's approach to LLM selection & data security
- **Graceful escalation / redirect** when a question is out of scope or unknown.

### ❌ Out of scope (deliberately cut)
- **Auth / user accounts** — not needed for a public support bot; would eat the time budget.
- **Live portal / real client data integration** — the bot *explains* the portal; it doesn't connect to it.
- **Real calendar/booking integration** — we surface a booking CTA/link, not a live scheduler.
- **Database / chat persistence** — conversation is in-memory per session; no history store.
- **Analytics dashboards, multi-tenant, CRM sync.**

### 🅿️ Deferred (stretch, only if time remains)
- Lead capture (collect email on escalation).
- A `/test-bot` custom command + lightweight eval over the brief's scenarios.
- Suggested-question chips on first load.

## Testing strategy

Two layers, chosen deliberately. Unit tests are **not** required by the brief, so this is a
focused, high-signal subset — not a coverage chase.
- **Behavior eval** (`npm run eval` / `/test-bot`) — the primary net for an AI product: fires the
  six brief scenarios and asserts grounding + guardrails end-to-end.
- **Focused unit tests** (`npm test`, Vitest) — the logic with real branches/edge cases: the
  `/api/chat` request validation + error paths, and the OpenRouter client (missing-key guard, model
  config). 100% coverage on those two files (enforced via `vitest.config.ts` thresholds).

Intentionally **not** unit-tested: presentational components (SVG), static knowledge strings, and
framework glue — low bug-catching value, and runtime behavior is already covered by the eval.

## Phases (sequential — Claude can execute these in order)

- **Phase 0 — Foundation (this commit).** git init, CLAUDE.md, plan.md, .gitignore, .claude/settings.json.
- **Phase 1 — Scaffold + deploy early.** `create-next-app`, Tailwind, push to GitHub, connect Vercel,
  ship a "hello world" to a public URL. Verify the deploy pipeline *before* building features.
- **Phase 2 — Backend brain.** OpenRouter client in `lib/`, the system prompt, the knowledge base,
  `/api/chat` route. Test grounded answers + escalation via curl before any UI.
- **Phase 3 — Chat UI.** Chat page wired to `/api/chat`, streaming, basic states (loading/error).
- **Phase 4 — Harden + verify.** Run the brief's scenarios end-to-end, error handling, refine the
  system prompt, tighten escalation. Redeploy.
- **Phase 5 — Stretch.** Only if time: items from Deferred above.

## Success criteria

The deployed bot correctly handles each brief scenario, **never invents facts**, and escalates
cleanly on the unanswerable one. CLAUDE.md + plan.md + clean commit history tell the build story.
