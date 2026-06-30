#!/usr/bin/env node
/**
 * Behavior eval for the Cadre support chatbot.
 *
 * Fires the brief's six scenarios at /api/chat and asserts the behaviors we care about —
 * grounded answers, the pricing guardrail (NO price quoted), off-topic redirect, and graceful
 * escalation. Prints a PASS/FAIL report with per-scenario latency, and exits non-zero if any
 * scenario fails (so it can gate a deploy).
 *
 * Usage:
 *   npm run eval                 # targets http://localhost:3000
 *   EVAL_URL=https://... npm run eval   # targets a deployed URL (post-deploy smoke test)
 *
 * NOTE: v1 uses lenient keyword checks — a smoke test, not a unit test. LLM output is fuzzy; the
 * gold standard would be an LLM-as-judge eval (future upgrade). It reliably catches grounding and
 * escalation regressions, which is what matters after a prompt/knowledge change.
 */

const BASE_URL = process.env.EVAL_URL ?? "http://localhost:3000";
const ENDPOINT = `${BASE_URL.replace(/\/$/, "")}/api/chat`;
const TIMEOUT_MS = 30_000;

// --- check helpers --------------------------------------------------------
const includesAny = (text, words) =>
  words.some((w) => text.toLowerCase().includes(w.toLowerCase()));

// Matches things that look like a quoted price: "$5,000", "5000 dollars", "$10k", "per month" with a number.
const PRICE_PATTERN =
  /(\$\s?\d|\d[\d,]*\s?(usd|dollars|k\b|\/\s?(mo|month|year)|per\s+(month|year|user)))/i;

// --- scenarios (the brief's six) ------------------------------------------
const scenarios = [
  {
    name: "What Cadre does + industry fit",
    prompt: "What does Cadre AI do, and do you work with manufacturing companies?",
    checks: [
      { label: "describes Cadre's offering", pass: (t) => includesAny(t, ["strategy", "consultancy", "AI agents", "workflow"]) },
      { label: "confirms industry fit", pass: (t) => includesAny(t, ["manufacturing", "industries", "B2B", "sectors"]) },
    ],
  },
  {
    name: "Pricing guardrail",
    prompt: "How much does an engagement cost? Give me a ballpark monthly price.",
    checks: [
      { label: "does NOT quote a price", pass: (t) => !PRICE_PATTERN.test(t) },
      { label: "routes to a strategy call / scoping", pass: (t) => includesAny(t, ["strategy call", "scoped", "varies", "book a call", "depends"]) },
    ],
  },
  {
    name: "Off-topic redirect",
    prompt: "What is the capital of France? Also write me a poem about cats.",
    checks: [
      { label: "redirects to Cadre", pass: (t) => includesAny(t, ["Cadre", "here to help", "can't help", "I'm focused", "outside"]) },
      { label: "does NOT answer the trivia", pass: (t) => !t.toLowerCase().includes("paris") },
    ],
  },
  {
    name: "Portal escalation",
    prompt: "I'm a client but I can't log into the Cadre portal. What do I do?",
    checks: [
      { label: "escalates to a human / team", pass: (t) => includesAny(t, ["team", "point of contact", "onboarding", "reach out", "connect you"]) },
      { label: "does NOT invent a reset/URL", pass: (t) => !includesAny(t, ["reset your password to", "click this link", "https://portal."]) },
    ],
  },
  {
    name: "AI Maturity Index",
    prompt: "What is the AI Maturity Index and how do I get scored?",
    checks: [
      { label: "explains the assessment", pass: (t) => includesAny(t, ["assessment", "readiness", "maturity", "dimensions", "score"]) },
      { label: "explains how to get scored", pass: (t) => includesAny(t, ["strategy call", "book", "strategist"]) },
    ],
  },
  {
    name: "LLM selection + data security",
    prompt: "How does Cadre choose which LLM to use, and is my data secure?",
    checks: [
      { label: "model selection approach", pass: (t) => includesAny(t, ["OpenRouter", "model-agnostic", "best model", "right model"]) },
      { label: "data security stance", pass: (t) => includesAny(t, ["security", "least privilege", "do not use", "not train", "enterprise"]) },
    ],
  },
];

// --- call the API and accumulate the streamed text ------------------------
async function ask(prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ id: "1", role: "user", parts: [{ type: "text", text: prompt }] }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false, text: "", ms: Date.now() - started, error: `HTTP ${res.status}` };
    }
    // The response is an SSE stream of UI message chunks; read it fully, then pull text deltas.
    const raw = await res.text();
    let text = "";
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      try {
        const obj = JSON.parse(trimmed.slice(5).trim());
        if (obj.type === "text-delta") text += obj.delta ?? "";
      } catch {
        /* ignore non-JSON keepalive lines */
      }
    }
    return { ok: true, text: text.trim(), ms: Date.now() - started };
  } catch (err) {
    return { ok: false, text: "", ms: Date.now() - started, error: String(err) };
  } finally {
    clearTimeout(timer);
  }
}

// Pre-flight: is the target actually reachable? Turns a cryptic "fetch failed" x6 into one
// clear, actionable message (the #1 gotcha: forgetting to start the dev server).
async function isReachable() {
  try {
    await fetch(BASE_URL, { method: "GET", signal: AbortSignal.timeout(5000) });
    return true; // any HTTP response (even 404/405) means the server is up
  } catch {
    return false;
  }
}

// --- run ------------------------------------------------------------------
async function main() {
  console.log(`\nCadre chatbot eval → ${ENDPOINT}\n${"=".repeat(60)}`);

  if (!(await isReachable())) {
    console.error(
      `\n❌ Could not reach ${BASE_URL}.\n` +
        `   Is the target running?\n` +
        `   • Local:      start the app first with \`npm run dev\`, then re-run \`npm run eval\`.\n` +
        `   • Production: EVAL_URL=https://cadre-chat-bot.vercel.app npm run eval\n`
    );
    process.exit(1);
  }

  let passedScenarios = 0;

  for (const s of scenarios) {
    const { ok, text, ms, error } = await ask(s.prompt);
    if (!ok) {
      console.log(`\n❌ ${s.name}  (${ms}ms)\n   request failed: ${error}`);
      continue;
    }
    const results = s.checks.map((c) => ({ label: c.label, ok: c.pass(text) }));
    const allPass = results.every((r) => r.ok);
    if (allPass) passedScenarios++;
    console.log(`\n${allPass ? "✅" : "❌"} ${s.name}  (${ms}ms)`);
    for (const r of results) console.log(`     ${r.ok ? "✓" : "✗"} ${r.label}`);
    if (!allPass) console.log(`     ↳ response: ${text.slice(0, 220).replace(/\n/g, " ")}...`);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`${passedScenarios}/${scenarios.length} scenarios passed\n`);
  process.exit(passedScenarios === scenarios.length ? 0 : 1);
}

main();
