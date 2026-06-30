# Cadre AI Support Chatbot

A customer-support chatbot for **Cadre AI**, an AI strategy & implementation consultancy. It
answers common inbound questions (services, industries, pricing posture, the AI Maturity Index,
the client portal, booking a strategy call, and Cadre's LLM/data-security approach) and
**escalates gracefully** when a question falls outside what it knows — so the human team can focus
on high-value conversations.

🔗 **Live app:** https://cadre-chat-bot.vercel.app/

## How it works

A single Next.js app. The chat UI POSTs the conversation to `/api/chat`, which assembles a grounded
system prompt (the curated knowledge base is injected directly into context) and streams a response
from a Claude model via OpenRouter.

```
Browser (chat UI) → /api/chat → Vercel AI SDK → OpenRouter → Claude → streamed reply
```

The bot answers **only** from the curated knowledge base in `src/knowledge/`; it never invents
prices or commitments, and routes anything it can't answer to a human / a strategy call.

## Tech stack

- **Next.js 16 (App Router) + TypeScript** — UI and API in one repo
- **Vercel** — hosting; every push to `main` auto-deploys
- **OpenRouter → Claude** — model access (model-agnostic, swappable)
- **Vercel AI SDK** (`ai`) — streaming + the `useChat` hook
- **Tailwind CSS** — styling

## Getting started

```bash
npm install

# add your OpenRouter key
echo "OPENROUTER_API_KEY=your_key_here" > .env.local

npm run dev      # http://localhost:3000
```

Other commands: `npm run build` (run before pushing — catches type errors), `npm run lint`.

### Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `OPENROUTER_API_KEY` | Yes | Get one at [openrouter.ai](https://openrouter.ai). Set locally in `.env.local` and in Vercel → Settings → Environment Variables for production. |

## Project structure

```
src/
  app/            # routes + chat UI (page.tsx, layout.tsx, api/chat/)
  knowledge/      # curated Cadre knowledge base — the bot's source of truth
  lib/            # system prompt + OpenRouter client
```

## Project docs

- **[CLAUDE.md](./CLAUDE.md)** — agent operating manual (rules, conventions, links)
- **[plan.md](./plan.md)** — phased build plan + explicit in/out-of-scope decisions
- **[spec.md](./spec.md)** — architecture & decision records (ADRs) + decision log
