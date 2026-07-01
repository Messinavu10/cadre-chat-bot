import { describe, it, expect, afterEach, vi } from "vitest";

// Snapshot env and restore after each test, since the module reads env at import time.
const ORIGINAL_ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe("openrouter client", () => {
  it("CHAT_MODEL defaults to Claude Haiku 4.5 when OPENROUTER_MODEL is unset", async () => {
    delete process.env.OPENROUTER_MODEL;
    vi.resetModules();
    const { CHAT_MODEL } = await import("./openrouter");
    expect(CHAT_MODEL).toBe("anthropic/claude-haiku-4.5");
  });

  it("CHAT_MODEL respects the OPENROUTER_MODEL override", async () => {
    process.env.OPENROUTER_MODEL = "anthropic/claude-sonnet-5";
    vi.resetModules();
    const { CHAT_MODEL } = await import("./openrouter");
    expect(CHAT_MODEL).toBe("anthropic/claude-sonnet-5");
  });

  it("getOpenRouter throws when OPENROUTER_API_KEY is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    vi.resetModules();
    const { getOpenRouter } = await import("./openrouter");
    expect(() => getOpenRouter()).toThrow(/OPENROUTER_API_KEY/);
  });

  it("getOpenRouter returns a provider when the key is present", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-v1-test-key";
    vi.resetModules();
    const { getOpenRouter } = await import("./openrouter");
    expect(getOpenRouter()).toBeDefined();
  });
});
