"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LogoMark } from "@/components/ui/Logo";
import { useVoiceInput } from "@/lib/useVoiceInput";
import { useIsMobile } from "@/lib/useIsMobile";
import { PlusIcon, MicIcon, SendIcon, PinIcon, CloseIcon, MoreIcon } from "@/components/ui/Icons";
import { createClient } from "@/lib/supabase/client";

type MessageFile = { filename: string; mimeType: string };

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  files?: MessageFile[];
};

type Attachment = { file: File; id: string };

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/png",
  "image/jpeg",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type ResponseLength = "auto" | "brief" | "detailed";

const LENGTH_LABEL: Record<ResponseLength, string> = {
  auto: "Auto",
  brief: "Brief",
  detailed: "Detailed",
};

const LENGTH_HINT: Record<ResponseLength, string> = {
  auto: "Let the assistant decide",
  brief: "Short and to the point",
  detailed: "Thorough, with structure",
};

export function ChatView({
  fullName,
  initialMessages = [],
  initialSessionId = null,
  isTemporary = false,
  onLimitReached,
  onSessionCreated,
  onEmailResponse,
  isSessionPinned = false,
  onTogglePin,
  initialInput = "",
  projectId = null,
  isLoggedIn = false,
}: {
  fullName: string | null;
  initialMessages?: Message[];
  initialSessionId?: string | null;
  isTemporary?: boolean;
  onLimitReached: (unlockAt: string) => void;
  onSessionCreated?: (id: string) => void;
  onEmailResponse?: (body: string) => void;
  isSessionPinned?: boolean;
  onTogglePin?: () => void;
  initialInput?: string;
  projectId?: string | null;
  isLoggedIn?: boolean;
}) {
  // Guests get "G", matching the prototype.
  const userInitial = fullName?.trim()?.[0]?.toUpperCase() ?? "G";
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState(initialInput);
  const [streaming, setStreaming] = useState(false);
  const [slowResponse, setSlowResponse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [responseLength, setResponseLength] = useState<ResponseLength>("auto");
  const [lengthMenuOpen, setLengthMenuOpen] = useState(false);
  const [messagesRemaining, setMessagesRemaining] = useState<number | null>(null);
  const [documentsUnlockAt, setDocumentsUnlockAt] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(initialSessionId);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const voice = useVoiceInput((transcript) => setInput((prev) => (prev ? `${prev} ${transcript}` : transcript)));
  const isMobile = useIsMobile();

  useEffect(() => {
    sessionIdRef.current = initialSessionId;
  }, [initialSessionId]);

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => {
        setMessagesRemaining(d.messagesRemaining ?? null);
        setDocumentsUnlockAt(d.documentsUnlockAt ?? null);
      })
      .catch(() => {});
  }, []);

  async function handleSend(e: React.SyntheticEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;

    const pendingFiles = attachments;
    setError(null);
    setInput("");
    setAttachments([]);
    setSlowResponse(false);
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      files: pendingFiles.map((a) => ({ filename: a.file.name, mimeType: a.file.type })),
    };
    const assistantId = crypto.randomUUID();
    const nextMessages = [...messages, userMessage];
    setMessages([...nextMessages, { id: assistantId, role: "assistant", text: "" }]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const slowTimer = setTimeout(() => setSlowResponse(true), 8000);

    try {
      // Files go straight from the browser to Storage: routing them through the
      // API would hit Vercel's 4.5MB request cap well before the 10MB per-file
      // limit the spec allows.
      let uploaded;
      try {
        uploaded = await uploadAttachments(pendingFiles);
      } catch (uploadErr) {
        clearTimeout(slowTimer);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId && m.id !== userMessage.id));
        setAttachments(pendingFiles);
        setAttachError((uploadErr as Error).message);
        setStreaming(false);
        return;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          isTemporary,
          projectId: sessionIdRef.current ? undefined : projectId,
          attachments: uploaded,
          responseLength,
          messages: nextMessages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            text: m.text,
          })),
        }),
      });

      if (res.status === 429) {
        const data = await res.json();
        setMessages((prev) => prev.filter((m) => m.id !== assistantId && m.id !== userMessage.id));
        // A document-only limit stays an inline warning: plain text messages
        // are still allowed, so the chat must not be locked out (spec §6.4).
        if (data.error === "document_limit_reached") {
          setInput(userMessage.text);
          setAttachments(pendingFiles);
          setAttachError("You've used all your document uploads for this window.");
        } else {
          onLimitReached(data.unlockAt);
        }
        setStreaming(false);
        return;
      }

      if (!res.ok || !res.body) {
        throw new Error("The assistant couldn't respond. Please try again.");
      }

      const newSessionId = res.headers.get("X-Session-Id");
      if (newSessionId && newSessionId !== sessionIdRef.current) {
        sessionIdRef.current = newSessionId;
        onSessionCreated?.(newSessionId);
      }

      const remainingHeader = res.headers.get("X-Messages-Remaining");
      setMessagesRemaining(remainingHeader ? Number(remainingHeader) : null);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      let failureDetail: string | null = null;
      const FAIL_MARKER = "[GEMFAIL] ";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk.includes(FAIL_MARKER)) {
          failureDetail = chunk.slice(chunk.indexOf(FAIL_MARKER) + FAIL_MARKER.length);
          break;
        }
        text += chunk;
        // Snapshot per iteration: closing over the running accumulator would
        // hand React a value that keeps changing after the update is queued.
        const soFar = text;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, text: soFar } : m)),
        );
      }

      if (failureDetail) {
        console.error("[chat] upstream failure detail:", failureDetail);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        setError("The assistant couldn't respond. Please try again.");
      } else if (!text) {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        setError("The assistant couldn't respond. Please try again.");
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
      clearTimeout(slowTimer);
      setSlowResponse(false);
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  function handleAttachClick() {
    // Storage RLS scopes every object to its owner's id, so there is nowhere
    // for a guest's upload to live.
    if (!isLoggedIn) {
      setAttachError("Log in to upload documents.");
      return;
    }
    fileInputRef.current?.click();
  }

  async function uploadAttachments(pending: Attachment[]) {
    if (pending.length === 0) return [];
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    return Promise.all(
      pending.map(async (a) => {
        // Storage RLS requires the first path segment to be the owner's id.
        const path = `${user.id}/${crypto.randomUUID()}-${a.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(path, a.file, { contentType: a.file.type });
        if (uploadError) throw new Error(`Couldn't upload ${a.file.name}.`);
        return { storagePath: path, filename: a.file.name, mimeType: a.file.type };
      }),
    );
  }

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setAttachError(null);

    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        setAttachError(`${file.name} is over the 10MB limit.`);
        continue;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        setAttachError(`${file.name} isn't a supported file type.`);
        continue;
      }
      setAttachments((prev) => [...prev, { file, id: crypto.randomUUID() }]);
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleCopy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function handleSaveDraft(text: string) {
    await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ai_response", title: text.slice(0, 60), content: text }),
    });
  }

  const isEmpty = messages.length === 0;

  const composerPlaceholder = documentsUnlockAt
    ? `Uploads paused until ${new Date(documentsUnlockAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} — you can still type`
    : isMobile
      ? "Ask anything…"
      : "Ask anything about compliance, drafting or your documents";

  const composer = (
    <form onSubmit={handleSend} className="mx-auto w-full max-w-2xl">
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((a) => (
            <span
              key={a.id}
              className="flex items-center gap-2 rounded-full bg-panel-grey px-3 py-1 text-xs text-navy-deeper dark:bg-white/10 dark:text-white"
            >
              {a.file.name}
              <button
                type="button"
                onClick={() => removeAttachment(a.id)}
                className="text-muted-grey hover:text-navy-deeper dark:text-white/50 dark:hover:text-white"
              >
                <CloseIcon size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      {attachError && <p className="mb-2 text-xs text-red-500">{attachError}</p>}

      <div className="flex items-center gap-3 rounded-full border border-black/10 bg-panel-grey px-3 py-2 dark:border-white/10 dark:bg-white/5">
        <input ref={fileInputRef} type="file" multiple hidden onChange={handleFilesSelected} />
        <button
          type="button"
          onClick={handleAttachClick}
          aria-label="Attach files"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-grey hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
        >
          <PlusIcon size={17} />
        </button>
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          placeholder={composerPlaceholder}
          className="max-h-32 flex-1 resize-none bg-transparent py-2 text-sm text-navy-deeper outline-none placeholder:text-muted-grey dark:text-white dark:placeholder:text-white/40"
        />
        {voice.supported && (
          <button
            type="button"
            onClick={voice.listening ? voice.stop : voice.start}
            aria-label="Voice input"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              voice.listening
                ? "animate-pulse bg-red-100 text-red-600"
                : "text-muted-grey hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
            }`}
          >
            <MicIcon size={17} />
          </button>
        )}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setLengthMenuOpen((o) => !o)}
            aria-label="Response length"
            title={`Response length: ${LENGTH_LABEL[responseLength]}`}
            className={`flex h-9 items-center justify-center gap-1 rounded-full px-2.5 text-xs ${
              responseLength === "auto"
                ? "text-muted-grey hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
                : "bg-teal/15 text-teal"
            }`}
          >
            <MoreIcon size={17} />
            {responseLength !== "auto" && <span>{LENGTH_LABEL[responseLength]}</span>}
          </button>
          {lengthMenuOpen && (
            <>
              <button
                type="button"
                aria-label="Close"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setLengthMenuOpen(false)}
              />
              <div className="absolute bottom-full right-0 z-20 mb-2 w-56 overflow-hidden rounded-2xl border border-black/10 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-navy-dark">
                <p className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-muted-grey dark:text-white/40">
                  Response length
                </p>
                {(["auto", "brief", "detailed"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setResponseLength(value);
                      setLengthMenuOpen(false);
                    }}
                    className={`flex w-full flex-col items-start px-3 py-2 text-left hover:bg-panel-grey dark:hover:bg-white/5 ${
                      responseLength === value ? "text-teal" : "text-navy-deeper dark:text-white"
                    }`}
                  >
                    <span className="text-sm">{LENGTH_LABEL[value]}</span>
                    <span className="text-xs text-muted-grey dark:text-white/40">
                      {LENGTH_HINT[value]}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {streaming ? (
          <button
            type="button"
            onClick={handleStop}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-deeper text-white"
            aria-label="Stop"
          >
            <span className="block h-2.5 w-2.5 rounded-[2px] bg-white" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal text-white disabled:opacity-40"
            aria-label="Send"
          >
            <SendIcon size={17} />
          </button>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between px-1 text-xs text-muted-grey dark:text-white/40">
        <span>
          {isTemporary
            ? "Temporary chat — nothing is saved"
            : "Enter to send · Shift + Enter for a new line"}
        </span>
        {messagesRemaining != null && (
          <span>{messagesRemaining} of 10 messages left</span>
        )}
      </div>
    </form>
  );

  if (isEmpty) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center overflow-hidden px-6 text-center">
        <div
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
          style={{ background: "linear-gradient(150deg, #00338D, #00124A)" }}
        >
          <LogoMark size={30} iconOnly />
        </div>
        <h1 className="font-display text-3xl font-semibold text-navy-deeper dark:text-white">
          {fullName ? `Good to see you, ${fullName.split(" ")[0]}.` : "Where should we begin?"}
        </h1>
        <p className="mt-2 text-muted-grey dark:text-white/50">
          {fullName
            ? "What would you like to work through today?"
            : "Ask a compliance question, or see what this assistant can do."}
        </p>
        {!fullName && (
          <button
            type="button"
            onClick={() => setInput("What can you do?")}
            className="mt-4 rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-navy-deeper hover:bg-black/5 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            What can you do?
          </button>
        )}
        <div className="mt-6 w-full">{composer}</div>
        {error && <p className="mx-auto mt-4 max-w-2xl text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
            {messages.map((m) => {
              const isStreamingThis = streaming && m.role === "assistant" && m === messages[messages.length - 1];
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-[13px] ${
                    m.role === "user" ? "justify-end" : "max-w-2xl"
                  }`}
                >
                  {m.role === "assistant" && (
                    <div
                      className="mt-0.5 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full"
                      style={{ background: "linear-gradient(150deg, #00338D, #00124A)" }}
                    >
                      <LogoMark size={17} iconOnly />
                    </div>
                  )}
                  <div
                    className={
                      m.role === "user"
                        ? "flex max-w-[82%] flex-col items-end"
                        : "min-w-0 flex-1"
                    }
                  >
                    <div
                      className={
                        m.role === "assistant"
                          ? "markdown-content max-w-none rounded-3xl rounded-bl-lg border border-black/5 bg-white px-5 py-3 text-navy-deeper dark:border-white/10 dark:bg-navy-dark dark:text-white"
                          : "rounded-3xl rounded-br-lg bg-teal px-5 py-3 text-white"
                      }
                    >
                      {m.role === "assistant" && m.text === "" && streaming ? (
                        <div>
                          <BouncingDots />
                          {slowResponse && (
                            <p className="mt-1 text-xs text-muted-grey dark:text-white/40">
                              Taking longer than usual — still trying…
                            </p>
                          )}
                        </div>
                      ) : m.role === "assistant" ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                      ) : (
                        <>
                          {m.files && m.files.length > 0 && (
                            <div className="mb-2 flex flex-wrap gap-1.5">
                              {m.files.map((f) => (
                                <span
                                  key={f.filename}
                                  className="max-w-[200px] truncate rounded-lg bg-white/20 px-2 py-1 text-xs"
                                >
                                  {f.filename}
                                </span>
                              ))}
                            </div>
                          )}
                          {m.text}
                        </>
                      )}
                    </div>
                    {m.role === "assistant" && m.text && !isStreamingThis && (
                      <div className="mt-1.5 flex gap-3 pl-1 text-xs text-muted-grey dark:text-white/40">
                        <button onClick={() => handleCopy(m.text, m.id)} className="hover:text-navy-deeper dark:hover:text-white">
                          {copiedId === m.id ? "Copied" : "Copy"}
                        </button>
                        <button onClick={() => handleSaveDraft(m.text)} className="hover:text-navy-deeper dark:hover:text-white">
                          Save Draft
                        </button>
                        {onTogglePin && (
                          <button
                            onClick={onTogglePin}
                            className="flex items-center gap-1 hover:text-navy-deeper dark:hover:text-white"
                          >
                            <PinIcon size={11} filled={isSessionPinned} />
                            {isSessionPinned ? "Unpin" : "Pin"}
                          </button>
                        )}
                        {onEmailResponse && (
                          <button onClick={() => onEmailResponse(m.text)} className="hover:text-navy-deeper dark:hover:text-white">
                            Send / Review
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {m.role === "user" && (
                    <div className="mt-0.5 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-black/10 bg-panel-grey font-display text-xs font-semibold text-navy-deeper dark:border-white/10 dark:bg-white/5 dark:text-white">
                      {userInitial}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
        {error && (
          <p className="mx-auto mt-4 max-w-2xl text-sm text-red-500">{error}</p>
        )}
      </div>

      <div className="border-t border-black/5 bg-white px-6 py-4 dark:border-white/10 dark:bg-navy-deeper">
        {composer}
      </div>
    </div>
  );
}

function BouncingDots() {
  return (
    <div className="flex gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 animate-bounce rounded-full bg-muted-grey/50 dark:bg-white/30"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
