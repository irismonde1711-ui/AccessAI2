"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LogoMark } from "@/components/ui/Logo";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export function ChatView({
  fullName,
  onLimitReached,
}: {
  fullName: string | null;
  onLimitReached: (unlockAt: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;

    setError(null);
    setInput("");
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", text };
    const assistantId = crypto.randomUUID();
    const nextMessages = [...messages, userMessage];
    setMessages([...nextMessages, { id: assistantId, role: "assistant", text: "" }]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          isTemporary: false,
          messages: nextMessages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            text: m.text,
          })),
        }),
      });

      if (res.status === 429) {
        const data = await res.json();
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
        onLimitReached(data.unlockAt);
        setStreaming(false);
        return;
      }

      if (!res.ok || !res.body) {
        throw new Error("The assistant couldn't respond. Please try again.");
      }

      const newSessionId = res.headers.get("X-Session-Id");
      if (newSessionId) sessionIdRef.current = newSessionId;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, text } : m)),
        );
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, text: `${m.text}\n\n[Response stopped]` }
              : m,
          ),
        );
      } else {
        setError("The assistant couldn't respond. Please try again.");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <h1 className="font-display text-3xl font-semibold text-navy-deeper">
              {fullName ? `Good to see you, ${fullName}` : "What's on your mind today?"}
            </h1>
            {fullName && (
              <p className="mt-2 text-muted-grey">What&apos;s on your mind today?</p>
            )}
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-lg rounded-3xl rounded-br-lg bg-teal px-5 py-3 text-white"
                    : "flex max-w-2xl gap-3"
                }
              >
                {m.role === "assistant" && (
                  <LogoMark size={28} />
                )}
                <div
                  className={
                    m.role === "assistant"
                      ? "markdown-content max-w-none rounded-3xl rounded-bl-lg border border-black/5 bg-white px-5 py-3 text-navy-deeper"
                      : ""
                  }
                >
                  {m.role === "assistant" && m.text === "" && streaming ? (
                    <BouncingDots />
                  ) : m.role === "assistant" ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                  ) : (
                    m.text
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {error && (
          <p className="mx-auto mt-4 max-w-2xl text-sm text-red-500">{error}</p>
        )}
      </div>

      <form onSubmit={handleSend} className="border-t border-black/5 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-full border border-black/10 bg-panel-grey px-5 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about compliance, drafting or your documents"
            className="flex-1 bg-transparent py-2 text-sm text-navy-deeper outline-none placeholder:text-muted-grey"
          />
          {streaming ? (
            <button
              type="button"
              onClick={handleStop}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-deeper text-white"
              aria-label="Stop"
            >
              ■
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-teal text-white disabled:opacity-40"
              aria-label="Send"
            >
              ↑
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function BouncingDots() {
  return (
    <div className="flex gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 animate-bounce rounded-full bg-muted-grey/50"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
