import { createOpenRouter } from "@openrouter/ai-sdk-provider";

/**
 * Which model the chatbot uses, via OpenRouter (see spec.md ADR-002/ADR-007).
 *
 * Default: Claude Haiku 4.5 — the fast, low-cost tier. A support bot is high-volume and
 * latency-sensitive, and our knowledge base is small, so the cheapest capable model is the right
 * trade-off. Overridable with OPENROUTER_MODEL (e.g. `anthropic/claude-sonnet-5`) without a code
 * change, because we route through OpenRouter.
 */
export const CHAT_MODEL =
  process.env.OPENROUTER_MODEL ?? "anthropic/claude-haiku-4.5";

/**
 * Build the OpenRouter provider. We read the key lazily (inside a function rather than at module
 * load) so a missing key surfaces as a clean API error in the route instead of crashing the build
 * or the whole server on import.
 */
export function getOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  return createOpenRouter({ apiKey });
}
