@AGENTS.md

# CLAUDE.md

Onboarding for an extremely fast, context-limited engineer. Read this before touching code.
This file is **opinionated on purpose** — follow it, don't re-derive it.

## What we're building

A customer-support chatbot for **Cadre AI** (an AI strategy & implementation consultancy).
It answers common inbound questions from prospective and existing clients so the human team can
focus on high-value conversations.

**The single most important behavior:** the bot is *grounded* — it answers only from the curated
knowledge base in `src/knowledge/`. When it doesn't know, it **escalates** (offers to book a call
or connect a human). It must **never invent** pricing, commitments, timelines, or facts about Cadre.
A bot that says "let me connect you" is correct; a bot that hallucinates a price is a failure.

See `plan.md` for phased scope and the explicit in/out-of-scope decisions, and `spec.md` for the
architecture and decision records (ADRs) behind every significant choice. Do not build anything
marked out-of-scope without updating `plan.md` first; record significant architecture decisions in
`spec.md` (add an ADR + a Decision Log entry).

## Project links

- **Live app:** https://cadre-chat-bot.vercel.app/
- **Repo:** https://github.com/Messinavu10/cadre-chat-bot
- **Deploy:** push to `main` → Vercel auto-deploys. No manual deploy step. Run `npm run build`
  locally before pushing — it catches type errors the deploy would otherwise fail on.

## Stack (decided — don't relitigate)

- **Next.js 16 (App Router) + TypeScript**, deployed on **Vercel**. One repo: UI + API routes.
  Chosen for fastest path to a public URL and "deploy early." NOTE: Next 16 has breaking changes
  vs. older training data — see `AGENTS.md` and check `node_modules/next/dist/docs/` before
  writing route code.
- **LLM via OpenRouter**, routed to a **Claude** model. OpenRouter is Cadre's named partner for
  model access; routing to Claude also mirrors their Anthropic partnership. One API, swappable model.
- **Chat plumbing:** **Vercel AI SDK** (`ai` **v6** — pinned) + `@openrouter/ai-sdk-provider` (v2).
  Gives us streaming + the `useChat` hook. NOTE: pinned to `ai@^6` because the provider's stable
  release peer-requires v6; do NOT bump `ai` to v7 (only alpha provider support exists). AI SDK v5+
  changed APIs vs. older docs — verify current `streamText`/route patterns before assuming.
- **Styling:** Tailwind CSS. **Components:** a UI lib (e.g. shadcn/ui) is allowed — not graded on CSS.

## Critical rules

1. **Grounded answers only.** All factual content comes from `src/knowledge/`. The system prompt
   forbids inventing facts and instructs escalation on gaps. Treat the system prompt as a graded
   artifact, not an afterthought.
2. **Never commit secrets.** The OpenRouter API key lives in `.env.local` (gitignored) and in
   Vercel env vars. Reference it as `OPENROUTER_API_KEY`.
3. **Verify as you go.** After any AI-generated change, read it and test the affected scenario.
   Don't accept code you can't explain — the review asks what Claude wrote vs. what I changed.
   (Case in point: the scaffold step once silently overwrote this file — always check diffs.)
4. **Small, frequent commits** with descriptive messages. The git history tells the build story.
   No `Co-Authored-By` / AI attribution trailers.
5. **Cut scope, don't pad.** 3 working features beat 8 broken ones. New scope → update `plan.md`.

## Project structure

```
src/
  app/
    page.tsx        # chat UI (Phase 3)
    layout.tsx
    api/chat/       # POST route → OpenRouter via AI SDK (Phase 2)
  knowledge/        # curated Cadre knowledge base — the bot's source of truth (Phase 2)
  lib/              # OpenRouter client + system prompt (Phase 2)
AGENTS.md           # agent coding rules (Next 16 warning)
CLAUDE.md           # this file
plan.md             # phased plan + scope decisions
spec.md             # architecture + decision records (ADRs) + decision log
```

## Commands

- Install: `npm install`
- Dev: `npm run dev` (http://localhost:3000)
- Build (run before every push — catches type errors): `npm run build`
- Lint: `npm run lint`
- Eval (behavior smoke test of the 6 brief scenarios — grounding + guardrails): `npm run eval`
  (targets localhost; `EVAL_URL=https://… npm run eval` for a post-deploy check). Run after any
  change to the system prompt or knowledge base.

## Environment variables

- `OPENROUTER_API_KEY` — required for `/api/chat`. Set in `.env.local` locally and in
  Vercel → Settings → Environment Variables for prod (then redeploy).

## Claude Code workflow notes

- Subagents and custom slash commands are added **when a task calls for them**, each in its own
  commit — not pre-fabricated up front.
- `/test-bot` (`.claude/commands/`) runs `npm run eval`, interprets failures, and proposes prompt/
  knowledge fixes — added after running the scenario checks by hand became repetitive.
- When debugging, give the actual error output + context; don't re-run a failing prompt blind.
