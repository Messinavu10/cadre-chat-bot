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

See `plan.md` for phased scope and the explicit in/out-of-scope decisions. Do not build anything
marked out-of-scope without updating `plan.md` first.

## Stack (decided — don't relitigate)

- **Next.js (App Router) + TypeScript**, deployed on **Vercel**. One repo: UI + API routes together.
  Chosen for fastest path to a public URL and "deploy early."
- **LLM via OpenRouter**, routed to a **Claude** model. OpenRouter is Cadre's named partner for
  model access; routing to Claude also mirrors their Anthropic partnership. One API, swappable model.
- **Styling:** Tailwind CSS. **Components:** allowed to use a UI lib (e.g. shadcn/ui) — we're not
  graded on hand-written CSS.

## Critical rules

1. **Grounded answers only.** All factual content comes from `src/knowledge/`. The system prompt
   forbids inventing facts and instructs escalation on gaps. Treat the system prompt as a graded
   artifact, not an afterthought.
2. **Never commit secrets.** The OpenRouter API key lives in `.env.local` (gitignored) and in
   Vercel env vars. Reference it as `OPENROUTER_API_KEY`.
3. **Verify as you go.** After any AI-generated change, read it and test the affected scenario.
   Don't accept code you can't explain — the review asks what Claude wrote vs. what I changed.
4. **Small, frequent commits** with descriptive messages. The git history tells the build story.
5. **Cut scope, don't pad.** 3 working features beat 8 broken ones. New scope → update `plan.md`.

## Project structure

> Seed — refine once the app is scaffolded.

```
src/
  app/            # Next.js App Router (chat UI page + /api/chat route)
  knowledge/      # Curated Cadre knowledge base (the bot's source of truth)
  lib/            # OpenRouter client, system prompt, helpers
CLAUDE.md         # this file
plan.md           # phased plan + scope decisions
```

## Commands

> Filled in after scaffolding (Phase 1).

- Install: `npm install`
- Dev: `npm run dev`
- Build (catches type errors before deploy): `npm run build`
- Deploy: push to `main` → Vercel auto-deploys (or `vercel --prod`)

## Environment variables

- `OPENROUTER_API_KEY` — required. Set in `.env.local` locally and in Vercel for prod.

## Claude Code workflow notes

- Subagents and custom slash commands are added **when a task calls for them**, each in its own
  commit — not pre-fabricated up front.
- When debugging, give the actual error output + context; don't re-run a failing prompt blind.
