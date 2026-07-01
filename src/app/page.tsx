"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { CubeLoader } from "@/components/CubeLoader";

const SUGGESTIONS = [
  "What does Cadre AI do?",
  "How do I book a strategy call?",
  "What is the AI Maturity Index?",
  "How does Cadre handle data security?",
];

// A UIMessage holds an array of parts; join the text parts into a single string to render.
function textOf(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

export default function Home() {
  const { messages, sendMessage, status, error } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const isBusy = status === "submitted" || status === "streaming";
  const last = messages[messages.length - 1];
  // Show the cube while we're waiting for the reply (before any assistant text streams in).
  const isThinking =
    isBusy && (!last || last.role !== "assistant" || textOf(last) === "");

  // Keep the newest message in view as things stream.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-4 py-4">
          <span className="h-2.5 w-2.5 rounded-sm bg-cadre-red" aria-hidden />
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
            Ask Cadre
          </h1>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
          {isEmpty ? (
            <div className="flex flex-col items-center gap-6 pt-16 text-center">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
                How can we help you with AI?
              </h2>
              <p className="max-w-md text-muted">
                Ask about Cadre AI&apos;s services, the AI Maturity Index, our approach to
                security, or how to book a strategy call.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:border-cadre-red hover:text-cadre-red"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {messages.map((m) => (
                <div key={m.id}>
                  {m.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl bg-card px-4 py-2.5 text-foreground shadow-sm ring-1 ring-border">
                        {textOf(m)}
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed text-foreground">
                      {textOf(m)}
                    </div>
                  )}
                </div>
              ))}

              {isThinking && (
                <div className="flex items-center gap-3 text-muted">
                  <CubeLoader />
                  <span className="text-sm">Ask Cadre is thinking…</span>
                </div>
              )}

              {status === "error" && (
                <div className="rounded-lg border border-cadre-red/40 bg-cadre-red/5 px-4 py-3 text-sm text-cadre-red">
                  Something went wrong reaching Ask Cadre. Please try again — or reach the
                  Cadre team directly at{" "}
                  <a href="https://cadreai.com" className="underline">
                    cadreai.com
                  </a>
                  .
                  {error?.message ? (
                    <span className="mt-1 block opacity-70">({error.message})</span>
                  ) : null}
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto w-full max-w-2xl px-4 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:border-cadre-red"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              rows={1}
              placeholder="Ask about Cadre AI…"
              className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-foreground placeholder:text-muted focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isBusy}
              className="rounded-xl bg-cadre-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cadre-red-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </form>
          <p className="mt-2 text-center text-xs text-muted">
            Ask Cadre answers from Cadre AI&apos;s knowledge base and can make mistakes.
          </p>
        </div>
      </footer>
    </div>
  );
}
