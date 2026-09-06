"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { isValidEmail } from "@/lib/validation";

type Mode = "send" | "review";
type Recipient = { email: string; useCount: number };

const TEMPLATES: Record<string, string> = {
  HR: "Dear team,\n\nAhead of the FY26 review cycle, please complete your self-assessment in the performance portal by Friday 19 September. Your manager will schedule a 45-minute conversation in the following two weeks.\n\nIf you need an adjustment to these dates, contact People & Culture directly.\n\nKind regards,",
  Client:
    "Dear [Name],\n\nFollowing our discussion last week, I am writing to confirm the scope of the Q3 compliance review and the documents we will need from your team by 12 September.\n\nI have attached the evidence request list. Please let me know if any item is likely to be delayed.\n\nKind regards,",
  Vendor:
    "Dear [Name],\n\nWe are finalising our vendor risk assessment for FY26 and require your current ISO 27001 certificate, most recent penetration test summary, and confirmation of subprocessor locations.\n\nCould you provide these by 15 September so we can complete our review on schedule.\n\nKind regards,",
  Escalation:
    "Dear [Name],\n\nI am escalating an unresolved matter first raised on 4 August regarding the delayed remediation of two high-severity findings.\n\nWe require a written remediation plan with dates by close of business Friday. If we do not receive one, we will refer the matter under clause 14 of the service agreement.\n\nRegards,",
};

const MODE_NOTE: Record<Mode, string> = {
  send: "Delivered straight to the recipient from your workspace address, and recorded in your send history.",
  review:
    "Subject line is prefixed with [Sent for Review] and the message is logged separately for compliance and audit purposes.",
};

export function EmailComposerModal({
  initialBody = "",
  initialRecipient = "",
  onClose,
  onNotify,
}: {
  initialBody?: string;
  initialRecipient?: string;
  onClose: () => void;
  onNotify?: (message: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("send");
  const [recipient, setRecipient] = useState(initialRecipient);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<"send" | "draft" | null>(null);

  useEffect(() => {
    fetch("/api/recipients")
      .then((r) => r.json())
      .then((d) => setRecipients(d.recipients ?? []))
      .catch(() => {});
  }, []);

  const matches = useMemo(() => {
    const query = recipient.trim().toLowerCase();
    if (!query) return [];
    return recipients.filter((r) => r.email.includes(query) && r.email !== query);
  }, [recipient, recipients]);

  async function handleSend() {
    setError(null);
    if (!isValidEmail(recipient)) {
      setError("Enter a valid recipient email.");
      return;
    }
    if (body.trim().length === 0) {
      setError("Message body can't be empty.");
      return;
    }
    setBusy("send");
    const res = await fetch("/api/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toEmail: recipient, body, type: mode }),
    });
    setBusy(null);
    if (res.status === 429) {
      setError("You've reached your email send limit for this window.");
      return;
    }
    if (!res.ok) {
      setError("Couldn't send the email. Please try again.");
      return;
    }
    const data = await res.json();
    if (data.delivered) {
      onNotify?.(mode === "review" ? "Sent for review" : "Email sent");
      setStatus(mode === "review" ? "Sent for review." : "Email sent.");
    } else {
      // Never claim delivery that didn't happen — the row is recorded either way.
      onNotify?.("Recorded in send history — delivery not configured");
      setStatus(
        "Recorded in your send history, but outbound delivery isn't configured yet, so it hasn't left the workspace.",
      );
    }
    setTimeout(onClose, 1600);
  }

  async function handleSaveDraft() {
    setError(null);
    if (body.trim().length === 0) {
      setError("Message body can't be empty.");
      return;
    }
    setBusy("draft");
    const res = await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "email",
        title: recipient || "Untitled email",
        content: body,
        toEmail: recipient || null,
      }),
    });
    setBusy(null);
    if (!res.ok) {
      setError("Couldn't save the draft. Please try again.");
      return;
    }
    onNotify?.("Email saved to Drafts");
    setStatus("Saved to Drafts.");
    setTimeout(onClose, 1200);
  }

  const modeButton = (value: Mode, title: string, subtitle: string) => (
    <button
      onClick={() => setMode(value)}
      className={`flex flex-1 flex-col items-start gap-[3px] rounded-[15px] px-4 py-3 text-left transition ${
        mode === value
          ? "border-[1.5px] border-teal bg-teal/10 text-navy-deeper dark:text-white"
          : "border border-black/10 bg-panel-grey text-muted-grey dark:border-white/10 dark:bg-white/5 dark:text-white/60"
      }`}
    >
      <span className="text-[13.5px] font-medium">{title}</span>
      <span className="text-[11.5px] opacity-70">{subtitle}</span>
    </button>
  );

  return (
    <Modal onClose={onClose}>
      <h2 className="font-display text-[19px] font-semibold text-navy-deeper dark:text-white">
        Send this response as an email
      </h2>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-grey dark:text-white/60">
        Choose whether it goes out directly or is logged for compliance review.
      </p>

      <div className="mt-5 flex gap-2.5">
        {modeButton("send", "Send", "Straight to the recipient")}
        {modeButton("review", "Send for Review", "Tagged and tracked separately")}
      </div>

      <div className="mt-3.5 rounded-xl bg-panel-grey px-3.5 py-2.5 text-[12.5px] leading-relaxed text-muted-grey dark:bg-white/5 dark:text-white/60">
        {MODE_NOTE[mode]}
      </div>

      <p className="mt-5 text-[11.5px] uppercase tracking-[0.08em] text-muted-grey dark:text-white/40">
        Quick templates
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {Object.keys(TEMPLATES).map((key) => (
          <button
            key={key}
            onClick={() => setBody(TEMPLATES[key])}
            className="rounded-[11px] border border-black/10 bg-panel-grey px-3.5 py-2 text-[12.5px] text-navy-deeper transition hover:border-teal dark:border-white/10 dark:bg-white/5 dark:text-white/80"
          >
            {key}
          </button>
        ))}
      </div>

      <div className="relative mt-5">
        <p className="mb-2.5 text-[11.5px] uppercase tracking-[0.08em] text-muted-grey dark:text-white/40">
          Recipient
        </p>
        <input
          type="email"
          value={recipient}
          onChange={(e) => {
            setRecipient(e.target.value);
            setSuggestionsOpen(true);
          }}
          onFocus={() => setSuggestionsOpen(true)}
          placeholder="name@organisation.com.au"
          className="modal-input w-full rounded-[13px] px-4 py-3 text-sm text-navy-deeper outline-none focus:border-teal dark:text-white"
        />
        {suggestionsOpen && matches.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1.5 overflow-hidden rounded-[14px] border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-navy-dark">
            {matches.map((r) => (
              <button
                key={r.email}
                onClick={() => {
                  setRecipient(r.email);
                  setSuggestionsOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13.5px] text-navy-deeper transition hover:bg-panel-grey dark:text-white dark:hover:bg-white/5"
              >
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal/15 text-[11px] text-teal">
                  {r.email[0].toUpperCase()}
                </span>
                <span className="flex-1 truncate">{r.email}</span>
                <span className="text-[11.5px] text-muted-grey dark:text-white/40">
                  {r.useCount === 1 ? "1 send" : `${r.useCount} sends`}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mb-2.5 mt-4 text-[11.5px] uppercase tracking-[0.08em] text-muted-grey dark:text-white/40">
        Message
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={8}
        className="modal-input min-h-[180px] w-full resize-none rounded-[15px] px-4 py-3.5 text-[13.8px] leading-relaxed text-navy-deeper outline-none focus:border-teal dark:text-white"
      />

      {error && <p className="mt-3 text-sm text-red-500 dark:text-red-400">{error}</p>}
      {status && <p className="mt-3 text-sm text-teal">{status}</p>}

      <div className="mt-5 flex flex-wrap justify-end gap-2.5">
        <button
          onClick={handleSaveDraft}
          disabled={busy !== null}
          className="rounded-[13px] border border-black/10 bg-panel-grey px-4 py-2.5 text-[13.5px] text-navy-deeper transition hover:bg-black/5 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
        >
          {busy === "draft" ? "Saving…" : "Save Draft"}
        </button>
        <button
          onClick={onClose}
          className="rounded-[13px] border border-black/10 bg-panel-grey px-4 py-2.5 text-[13.5px] text-muted-grey transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          onClick={handleSend}
          disabled={busy !== null}
          className="min-w-[140px] rounded-[13px] bg-gradient-to-br from-teal to-[#019a88] px-5 py-2.5 text-[13.5px] font-medium text-white shadow-[0_8px_20px_rgba(0,176,155,.26)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === "send" ? "Sending…" : mode === "review" ? "Send for Review" : "Send Email"}
        </button>
      </div>
    </Modal>
  );
}
