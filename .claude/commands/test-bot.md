---
description: Run the chatbot behavior eval suite and report results
argument-hint: "[optional target URL, defaults to localhost:3000]"
---

Run the Cadre support-chatbot evaluation suite and report on it.

1. Determine the target. If `$ARGUMENTS` contains a URL, use it (e.g. the production URL); otherwise
   default to `http://localhost:3000`. If targeting localhost, make sure `npm run dev` is running —
   start it in the background if it isn't, and wait until it responds before continuing.
2. Run the eval:
   - localhost: `npm run eval`
   - a specific target: `EVAL_URL=<url> npm run eval`
3. Summarize the results clearly: which of the six scenarios passed/failed, and call out any
   regression in the **critical behaviors** specifically — the pricing guardrail (no price quoted),
   the off-topic redirect, and graceful escalation (portal/human handoff).
4. If anything failed, diagnose the likely cause in `src/lib/system-prompt.ts` or the relevant file
   in `src/knowledge/`, and propose a specific, minimal fix. **Do not apply the fix without
   confirming first** — explain what you'd change and why.

Keep the report tight. The eval is a smoke test (lenient keyword checks), so a failed check may be a
brittle assertion rather than a real regression — note that distinction when it applies.
