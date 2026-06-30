import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { getOpenRouter, CHAT_MODEL } from "@/lib/openrouter";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";

// Allow the streamed response up to 30s before the serverless function times out.
export const maxDuration = 30;

// Small helper so every error path returns consistent JSON.
function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * POST /api/chat
 *
 * Receives the conversation (UIMessage[] from the `useChat` hook), prepends our grounded system
 * prompt, and streams Claude's reply back via OpenRouter. The system prompt embeds the entire
 * knowledge base, so the model answers only from Cadre's facts and escalates on gaps.
 */
export async function POST(req: Request) {
  // 1. Parse + validate the request body.
  let messages: UIMessage[];
  try {
    const body = await req.json();
    messages = body.messages;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  if (!Array.isArray(messages)) {
    return jsonError("`messages` must be an array", 400);
  }

  // 2. Build the provider (clean 500 if the server is misconfigured).
  let openrouter;
  try {
    openrouter = getOpenRouter();
  } catch {
    return jsonError("Server is missing OPENROUTER_API_KEY", 500);
  }

  // 3. Stream the model's response. convertToModelMessages() turns the UI message format
  //    (with `parts`) into the plain role/content shape the model expects.
  const result = streamText({
    model: openrouter(CHAT_MODEL),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
  });

  // toUIMessageStreamResponse() streams chunks in the format `useChat` consumes on the client.
  return result.toUIMessageStreamResponse();
}
