"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LogoMark } from "@/components/ui/Logo";
import { useVoiceInput } from "@/lib/useVoiceInput";
import { useIsMobile } from "@/lib/useIsMobile";
import { PlusIcon, MicIcon, SendIcon, PinIcon, CloseIcon, MoreIcon } from "@/components/ui/Icons";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { normaliseMarkdown } from "@/lib/markdown";
import { createClient } from "@/lib/supabase/client";
import { downloadAsWord, downloadTablesAsExcel, hasTable, printAsPdf } from "@/lib/export/documents";

type Translation = { language: "fr" | "en"; label: string; text: string };

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

// What the conversation shows when someone asks for a document back in an
// editable form, so the transcript reads as a request they made.
const CONVERT_REQUEST = "Give me this document back as an editable draft.";
const FILL_REQUEST = "Help me fill this template in.";

type ResponseLength = "auto" | "brief" | "detailed";

const LENGTH_LABEL: Record<ResponseLength, string> = {
  auto: "Auto",
  brief: "Brief",
  detailed: "Detailed",
};

const TEMPLATES: { label: string; prompt: string }[] = [
  {
    label: "Board paper",
    prompt:
      "Draft a board paper on [topic]. Include purpose, background, key risks, options with pros and cons, a recommendation, and the decision sought. Keep it to one page.",
  },
  {
    label: "Risk register",
    prompt:
      "Build a risk register for [activity or project] as a table with columns: Risk, Category, Likelihood, Consequence, Inherent rating, Controls, Residual rating, Owner, Review date. Suggest eight risks to start from.",
  },
  {
    label: "Obligations list",
    prompt:
      "List the compliance obligations for [type of organisation] in [jurisdiction] as a table with columns: Obligation, Source or legislation, Frequency, Due date, Responsible, Evidence required.",
  },
  {
    label: "Review a document",
    prompt:
      "Review the attached document and tell me: what it commits us to, anything unusual or one-sided, what is missing, and the three things I should question before signing.",
  },
  {
    label: "Policy draft",
    prompt:
      "Draft a [policy name] policy for a small Australian organisation. Include purpose, scope, roles and responsibilities, the policy itself, breaches, and a review cycle.",
  },
  {
    label: "Reply to a regulator",
    prompt:
      "Help me draft a response to a regulator's notice. Ask me for the notice details first, then produce a measured, factual reply that answers each point raised.",
  },
];

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
  isPaid = false,
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
  isPaid?: boolean;
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
  const [exportMenuFor, setExportMenuFor] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  // Translations sit beside the original rather than replacing it: the answer
  // was produced in one language for a reason, and people compare the two.
  const [translations, setTranslations] = useState<Record<string, Translation>>({});
  // An answer is usually a draft of something: a paragraph to soften, a name
  // to correct. Editing it here means the Word file or the PDF comes out right
  // the first time, instead of being fixed again in another program.
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [translateMenuFor, setTranslateMenuFor] = useState<string | null>(null);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  // Filling a template in takes two exchanges — the questions, then the
  // answers — and the second one carries no file, so the instruction has to
  // survive one more turn and then stop.
  const [awaitingFillAnswers, setAwaitingFillAnswers] = useState(false);
  const [messagesRemaining, setMessagesRemaining] = useState<number | null>(null);
  const [documentsUnlockAt, setDocumentsUnlockAt] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(initialSessionId);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Word and Excel are written in the browser from the answer's own markdown,
  // so exporting costs nothing and works offline once the page is open.
  async function handleExport(id: string, text: string, format: "word" | "pdf" | "excel") {
    setExportMenuFor(null);
    setError(null);
    setExportingId(id);
    try {
      if (format === "word") await downloadAsWord(text);
      else if (format === "excel") await downloadTablesAsExcel(text);
      else printAsPdf(text);
    } catch (err) {
      console.error("[export] failed:", err);
      setError("That download didn't work. Please try again.");
    } finally {
      setExportingId(null);
    }
  }

  function startEditing(id: string, text: string) {
    setExportMenuFor(null);
    setTranslateMenuFor(null);
    setEditingId(id);
    setEditDraft(text);
  }

  function saveEdit(id: string) {
    const text = editDraft.trim();
    setEditingId(null);
    if (text.length === 0) return;
    setEdits((current) => ({ ...current, [id]: text }));
    // The answer is no longer the one that was translated, so the translation
    // belongs to a version that no longer exists. Dropping it keeps the
    // Translate button honest: it will translate what is actually on screen.
    setTranslations((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setShowOriginal((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function revertEdit(id: string) {
    setEditingId(null);
    setEdits((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function handleTranslate(id: string, text: string, language: "fr" | "en", label: string) {
    setTranslateMenuFor(null);
    setError(null);

    // Already translated into this language once: show it again rather than
    // spending another message on the same work.
    if (translations[id]?.language === language) {
      setShowOriginal((current) => ({ ...current, [id]: false }));
      return;
    }

    setTranslatingId(id);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, target: language }),
      });
      const remainingHeader = res.headers.get("X-Messages-Remaining");
      if (remainingHeader !== null) setMessagesRemaining(remainingHeader ? Number(remainingHeader) : null);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error === "limit_reached"
            ? "You have used this period's messages. A translation counts as one."
            : (data.error ?? "The translation did not come through."),
        );
        return;
      }
      setTranslations((current) => ({ ...current, [id]: { language, label, text: data.text } }));
      setShowOriginal((current) => ({ ...current, [id]: false }));
    } catch {
      setError("The translation did not come through.");
    } finally {
      setTranslatingId(null);
    }
  }

  async function handleSend(e: React.SyntheticEvent, documentAction?: "convert" | "fill") {
    e.preventDefault();
    const convert = documentAction !== undefined;
    const text = convert
      ? documentAction === "fill"
        ? FILL_REQUEST
        : CONVERT_REQUEST
      : input.trim();
    if (!text || streaming) return;
    if (convert && attachments.length === 0) return;

    const mode =
      documentAction === "fill" || (!convert && awaitingFillAnswers)
        ? "fill"
        : documentAction === "convert"
          ? "convert"
          : "chat";
    // The questions have been asked, so the next message is the answers; after
    // that the conversation goes back to being an ordinary one.
    setAwaitingFillAnswers(documentAction === "fill");

    const pendingFiles = attachments;
    setError(null);
    // A conversion carries its own sentence, so anything half-typed in the
    // box is left where it was rather than thrown away.
    if (!convert) setInput("");
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
          mode,
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
          if (!convert) setInput(userMessage.text);
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
          {attachments.some((a) => !a.file.type.startsWith("image/")) && (
            <button
              type="button"
              onClick={(e) => handleSend(e, "convert")}
              disabled={streaming}
              title="Read the document and hand it back as a draft you can edit, then download as Word or PDF"
              className="flex items-center gap-1.5 rounded-full border border-teal/40 bg-teal/10 px-3 py-1 text-xs font-medium text-teal transition hover:bg-teal/20 disabled:opacity-50"
            >
              Make it editable
            </button>
          )}
          {attachments.some((a) => !a.file.type.startsWith("image/")) && (
            <button
              type="button"
              onClick={(e) => handleSend(e, "fill")}
              disabled={streaming}
              title="Work out every blank in the template and ask you for them, then complete the document"
              className="flex items-center gap-1.5 rounded-full border border-teal/40 bg-teal/10 px-3 py-1 text-xs font-medium text-teal transition hover:bg-teal/20 disabled:opacity-50"
            >
              Fill this in
            </button>
          )}
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
          ref={inputRef}
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
                {(["auto", "brief", "detailed"] as const).map((value) => {
                  // Detailed spends the most on output tokens, so it is a paid
                  // benefit rather than something guests can run up a bill with.
                  const locked = value === "detailed" && !isPaid;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        if (locked) return;
                        setResponseLength(value);
                        setLengthMenuOpen(false);
                      }}
                      className={`flex w-full flex-col items-start px-3 py-2 text-left ${
                        locked
                          ? "cursor-not-allowed opacity-50"
                          : "hover:bg-panel-grey dark:hover:bg-white/5"
                      } ${
                        responseLength === value ? "text-teal" : "text-navy-deeper dark:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-sm">
                        {LENGTH_LABEL[value]}
                        {locked && (
                          <span className="rounded-full bg-teal/15 px-1.5 py-0.5 text-[10px] font-medium text-teal">
                            Pro
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-grey dark:text-white/40">
                        {locked ? "Upgrade to unlock longer answers" : LENGTH_HINT[value]}
                      </span>
                    </button>
                  );
                })}
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
          {fullName
            ? "G'Day"
            : "Start Purposely Driven Projects"}
        </h1>
        <p className="mt-2 text-muted-grey dark:text-white/50">
          {fullName
            ? "What brings you to us today?"
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

        <div className="mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
          {TEMPLATES.map((template) => (
            <button
              key={template.label}
              type="button"
              onClick={() => {
                setInput(template.prompt);
                inputRef.current?.focus();
              }}
              title={template.prompt}
              className="rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-[13px] text-navy-deeper transition hover:border-teal/40 hover:bg-teal/5 dark:border-white/15 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
            >
              {template.label}
            </button>
          ))}
        </div>
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
              // Everything downstream — what is shown, copied, emailed and
              // exported — follows the version currently on screen.
              const translation = showOriginal[m.id] ? undefined : translations[m.id];
              const shownText = translation ? translation.text : (edits[m.id] ?? m.text);
              const isEditing = editingId === m.id;
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
                      {m.role === "assistant" && isEditing ? (
                        <div>
                          <textarea
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            rows={Math.min(24, Math.max(4, editDraft.split("\n").length + 1))}
                            autoFocus
                            aria-label="Edit this answer"
                            className="w-full resize-y rounded-xl border border-black/10 bg-panel-grey p-3 font-mono text-[13px] leading-relaxed text-navy-deeper outline-none focus:border-teal dark:border-white/15 dark:bg-white/5 dark:text-white"
                          />
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
                            <button
                              onClick={() => saveEdit(m.id)}
                              className="rounded-full bg-teal px-3 py-1.5 font-semibold text-white hover:opacity-90"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-muted-grey hover:text-navy-deeper dark:text-white/50 dark:hover:text-white"
                            >
                              Cancel
                            </button>
                            {edits[m.id] && (
                              <button
                                onClick={() => revertEdit(m.id)}
                                className="text-muted-grey hover:text-navy-deeper dark:text-white/50 dark:hover:text-white"
                              >
                                Undo my changes
                              </button>
                            )}
                            <span className="ml-auto hidden text-muted-grey sm:inline dark:text-white/40">
                              Markdown — **bold**, ## heading, | table |
                            </span>
                          </div>
                        </div>
                      ) : m.role === "assistant" && m.text === "" && streaming ? (
                        <div>
                          <BouncingDots />
                          {slowResponse && (
                            <p className="mt-1 text-xs text-muted-grey dark:text-white/40">
                              Taking longer than usual — still trying…
                            </p>
                          )}
                        </div>
                      ) : m.role === "assistant" ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{normaliseMarkdown(shownText)}</ReactMarkdown>
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
                    {m.role === "assistant" && m.text && !isStreamingThis && !isEditing && (
                      <div className="mt-1.5 flex gap-3 pl-1 text-xs text-muted-grey dark:text-white/40">
                        <button onClick={() => handleCopy(shownText, m.id)} className="hover:text-navy-deeper dark:hover:text-white">
                          {copiedId === m.id ? "Copied" : "Copy"}
                        </button>
                        <button
                          onClick={() => startEditing(m.id, shownText)}
                          className="hover:text-navy-deeper dark:hover:text-white"
                        >
                          {edits[m.id] ? "Edited" : "Edit"}
                        </button>
                        <button onClick={() => handleSaveDraft(shownText)} className="hover:text-navy-deeper dark:hover:text-white">
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
                          <button onClick={() => onEmailResponse(shownText)} className="hover:text-navy-deeper dark:hover:text-white">
                            Send / Review
                          </button>
                        )}
                        <ActionMenu
                          open={exportMenuFor === m.id}
                          onToggle={() => setExportMenuFor(exportMenuFor === m.id ? null : m.id)}
                          onClose={() => setExportMenuFor(null)}
                          closeLabel="Close download menu"
                          label={exportingId === m.id ? "Preparing…" : "Download"}
                        >
                          <button
                            onClick={() => handleExport(m.id, shownText, "word")}
                            className="block w-full px-3 py-2 text-left text-[13px] text-navy-deeper hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                          >
                            Word document
                          </button>
                          <button
                            onClick={() => handleExport(m.id, shownText, "pdf")}
                            className="block w-full px-3 py-2 text-left text-[13px] text-navy-deeper hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                          >
                            PDF
                          </button>
                          {hasTable(shownText) && (
                            <button
                              onClick={() => handleExport(m.id, shownText, "excel")}
                              className="block w-full px-3 py-2 text-left text-[13px] text-navy-deeper hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                            >
                              Excel spreadsheet
                            </button>
                          )}
                        </ActionMenu>
                        <ActionMenu
                          open={translateMenuFor === m.id}
                          onToggle={() => setTranslateMenuFor(translateMenuFor === m.id ? null : m.id)}
                          onClose={() => setTranslateMenuFor(null)}
                          closeLabel="Close translate menu"
                          label={
                            translatingId === m.id ? "Translating…" : translation ? translation.label : "Translate"
                          }
                        >
                          {translation && (
                            <button
                              onClick={() => {
                                setTranslateMenuFor(null);
                                setShowOriginal((current) => ({ ...current, [m.id]: true }));
                              }}
                              className="block w-full px-3 py-2 text-left text-[13px] text-navy-deeper hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                            >
                              Show the original
                            </button>
                          )}
                          <button
                            onClick={() => handleTranslate(m.id, shownText, "fr", "French")}
                            className="block w-full px-3 py-2 text-left text-[13px] text-navy-deeper hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                          >
                            French
                          </button>
                          <button
                            onClick={() => handleTranslate(m.id, shownText, "en", "English")}
                            className="block w-full px-3 py-2 text-left text-[13px] text-navy-deeper hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                          >
                            English
                          </button>
                        </ActionMenu>
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
