import { describe, it, expect, beforeEach, vi } from "vitest";

// Mocks must exist before the (hoisted) vi.mock factories run — vi.hoisted guarantees that.
const { streamTextMock, convertMock, getOpenRouterMock } = vi.hoisted(() => ({
  streamTextMock: vi.fn(),
  convertMock: vi.fn(),
  getOpenRouterMock: vi.fn(),
}));

vi.mock("ai", () => ({
  streamText: streamTextMock,
  convertToModelMessages: convertMock,
}));

vi.mock("@/lib/openrouter", () => ({
  CHAT_MODEL: "test-model",
  getOpenRouter: getOpenRouterMock,
}));

// SYSTEM_PROMPT is imported for real (it's just a string) so we can assert it's passed through.
import { POST } from "./route";

function post(body: string) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  convertMock.mockResolvedValue([{ role: "user", content: "hi" }]);
  getOpenRouterMock.mockReturnValue((model: string) => ({ model }));
  streamTextMock.mockReturnValue({
    toUIMessageStreamResponse: () => new Response("stream", { status: 200 }),
  });
});

describe("POST /api/chat", () => {
  it("returns 400 for an invalid JSON body", async () => {
    const res = await POST(post("{not valid json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid json/i);
  });

  it("returns 400 when `messages` is not an array", async () => {
    const res = await POST(post(JSON.stringify({ messages: "nope" })));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/messages/i);
  });

  it("returns 500 when the API key is missing", async () => {
    getOpenRouterMock.mockImplementationOnce(() => {
      throw new Error("OPENROUTER_API_KEY is not set");
    });
    const res = await POST(post(JSON.stringify({ messages: [] })));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/OPENROUTER_API_KEY/i);
  });

  it("streams a grounded reply on the success path", async () => {
    const messages = [
      { id: "1", role: "user", parts: [{ type: "text", text: "hi" }] },
    ];
    const res = await POST(post(JSON.stringify({ messages })));

    expect(res.status).toBe(200);
    expect(streamTextMock).toHaveBeenCalledTimes(1);

    const arg = streamTextMock.mock.calls[0][0];
    expect(arg.system).toMatch(/Cadre AI/); // the real grounded system prompt
    expect(convertMock).toHaveBeenCalledWith(messages);
    expect(arg.messages).toEqual([{ role: "user", content: "hi" }]);
  });
});
