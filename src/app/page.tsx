"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CadreCube } from "@/components/CadreCube";
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

// The system prompt tells the model to avoid em dashes, but that's probabilistic, so enforce it
// deterministically at render. Only horizontal whitespace ([^\S\r\n]) around the dash is consumed,
// never newlines, so list/paragraph structure is preserved (a "\s"-based version merged lines).
function stripEmDashes(text: string): string {
  return text.replace(/[^\S\r\n]*—[^\S\r\n]*/g, ", ");
}

export default function Home() {
  const { messages, sendMessage, status, error, setMessages, stop } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const isBusy = status === "submitted" || status === "streaming";
  const last = messages[messages.length - 1];
  const isThinking =
    isBusy && (!last || last.role !== "assistant" || textOf(last) === "");
  const isEmpty = messages.length === 0;

  useEffect(() => {
    if (!isEmpty) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking, isEmpty]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  async function newChat() {
    await stop(); // abort any in-flight stream before clearing, or it keeps generating
    setMessages([]);
    setInput("");
  }

  // Reused in two places: centered on the empty state, pinned to the bottom during a chat.
  const inputBar = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(input);
      }}
      className="rounded-2xl border border-border bg-card px-3 pb-2 pt-3 shadow-sm transition-colors focus-within:border-foreground"
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
        className="block max-h-40 min-h-[52px] w-full resize-none bg-transparent px-1 text-foreground placeholder:text-muted focus:outline-none"
      />
      <div className="flex items-center justify-end pt-1">
        <button
          type="submit"
          disabled={!input.trim() || isBusy}
          aria-label="Send"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3.4 20.4l17.45-7.48a1 1 0 0 0 0-1.84L3.4 3.6a.993.993 0 0 0-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .69.71 1.16 1.39.91z" />
          </svg>
        </button>
      </div>
    </form>
  );

  const disclaimer = (
    <p className="mt-2 text-center text-xs text-muted">
      Ask Cadre answers from Cadre AI&apos;s knowledge base and can make mistakes.
    </p>
  );

  return (
    <div className="flex flex-1 flex-col">
      {/* Header — cube mark + wordmark, left aligned */}
      <header className="border-b border-border">
        <div className="flex w-full items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <CadreCube size={22} />
            <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
              Ask Cadre
            </span>
          </div>
          {!isEmpty && (
            <button
              type="button"
              onClick={newChat}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-foreground transition-colors hover:border-foreground"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
              </svg>
              New chat
            </button>
          )}
        </div>
      </header>

      {isEmpty ? (
        /* Empty state — everything centered, input in the middle (Claude-style) */
        <main className="grid flex-1 place-items-center overflow-y-auto px-4 py-10">
          <div className="flex w-full max-w-2xl flex-col items-center">
            <CadreCube size={44} />
            <h1 className="mt-5 text-center font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
              How can we help you with your AI strategy?
            </h1>
            <p className="mt-3 max-w-md text-center text-muted">
              Ask about Cadre AI&apos;s services, the AI Maturity Index, our approach to
              security, or how to book a strategy call.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:border-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-4 w-full">{inputBar}</div>
            {disclaimer}
          </div>
        </main>
      ) : (
        /* Conversation — messages scroll, input pinned to the bottom */
        <>
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] whitespace-pre-wrap [overflow-wrap:anywhere] rounded-2xl bg-card px-4 py-2.5 text-foreground ring-1 ring-border">
                      {textOf(m)}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex gap-3">
                    <CadreCube size={20} className="mt-1 shrink-0" />
                    <div className="prose-cadre min-w-0 flex-1 [overflow-wrap:anywhere] text-foreground">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: (props) => (
                            <a {...props} target="_blank" rel="noopener noreferrer" />
                          ),
                        }}
                      >
                        {stripEmDashes(textOf(m))}
                      </ReactMarkdown>
                    </div>
                  </div>
                )
              )}

              {isThinking && (
                <div className="flex items-center gap-2.5 text-muted">
                  <CubeLoader />
                  <span className="text-sm">Ask Cadre is thinking…</span>
                </div>
              )}

              {status === "error" && (
                <div className="rounded-lg border border-foreground/20 bg-foreground/[0.03] px-4 py-3 text-sm">
                  Something went wrong reaching Ask Cadre. Please try again — or reach the
                  Cadre team directly at{" "}
                  <a
                    href="https://cadreai.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    cadreai.com
                  </a>
                  .
                  {error?.message ? (
                    <span className="mt-1 block text-muted">({error.message})</span>
                  ) : null}
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </main>

          <footer className="border-t border-border">
            <div className="mx-auto w-full max-w-2xl px-4 py-4">
              {inputBar}
              {disclaimer}
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
