"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { isValidEmail } from "@/lib/validation";

type Mode = "send" | "review";

const TEMPLATES: Record<string, string> = {
  HR: "Hi,\n\nFollowing up regarding ",
  Client: "Hi,\n\nThank you for your patience. Regarding your matter, ",
  Vendor: "Hi,\n\nWe'd like to follow up on ",
  Escalation: "Hi,\n\nEscalating the following for urgent attention: ",
};

export function EmailComposerModal({
  initialBody = "",
  onClose,
}: {
  initialBody?: string;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>("send");
  const [recipient, setRecipient] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/recipients")
      .then((r) => r.json())
      .then((d) => setRecipients(d.recipients ?? []))
      .catch(() => {});
  }, []);

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
    setLoading(true);
    const res = await fetch("/api/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toEmail: recipient, body, type: mode }),
    });
    setLoading(false);
    if (res.status === 429) {
      setError("You've reached your email send limit for this window.");
      return;
    }
    if (!res.ok) {
      setError("Couldn't send the email. Please try again.");
      return;
    }
    setSuccess(true);
    setTimeout(onClose, 1200);
  }

  async function handleSaveDraft() {
    setError(null);
    if (body.trim().length === 0) {
      setError("Message body can't be empty.");
      return;
    }
    setLoading(true);
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
    setLoading(false);
    if (!res.ok) {
      setError("Couldn't save the draft. Please try again.");
      return;
    }
    setSuccess(true);
    setTimeout(onClose, 1200);
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="font-display text-xl font-semibold text-navy-deeper dark:text-white">
        Send this response as an email
      </h2>
      <p className="mt-1 text-sm text-muted-grey dark:text-white/60">
        Choose whether it goes out directly or is logged for compliance review.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setMode("send")}
          className={`rounded-xl border p-3 text-left ${
            mode === "send"
              ? "border-teal bg-teal/10 dark:bg-white/10"
              : "border-black/10 dark:border-white/10"
          }`}
        >
          <p className="text-sm font-medium text-navy-deeper dark:text-white">Send</p>
          <p className="text-xs text-muted-grey dark:text-white/50">Straight to the recipient</p>
        </button>
        <button
          onClick={() => setMode("review")}
          className={`rounded-xl border p-3 text-left ${
            mode === "review"
              ? "border-teal bg-teal/10 dark:bg-white/10"
              : "border-black/10 dark:border-white/10"
          }`}
        >
          <p className="text-sm font-medium text-navy-deeper dark:text-white">Send for Review</p>
          <p className="text-xs text-muted-grey dark:text-white/50">Tagged and tracked separately</p>
        </button>
      </div>

      <p className="mt-3 text-xs text-muted-grey dark:text-white/40">
        Delivered straight to the recipient from your workspace address, and recorded in your
        send history.
      </p>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-grey dark:text-white/40">
        Quick templates
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {Object.keys(TEMPLATES).map((key) => (
          <button
            key={key}
            onClick={() => setBody((b) => `${TEMPLATES[key]}${b}`)}
            className="rounded-full border border-black/15 px-3 py-1 text-xs text-muted-grey hover:bg-black/5 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5"
          >
            {key}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-grey dark:text-white/40">
          Recipient
        </label>
        <input
          type="email"
          list="recipient-suggestions"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="name@organisation.com.au"
          className="modal-input w-full rounded-xl px-4 py-3 text-sm text-navy-deeper outline-none focus:border-teal dark:text-white"
        />
        <datalist id="recipient-suggestions">
          {recipients.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-grey dark:text-white/40">
          Message
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="modal-input w-full resize-none rounded-xl px-4 py-3 text-sm text-navy-deeper outline-none focus:border-teal dark:text-white"
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {success && <p className="mt-3 text-sm text-teal">Done.</p>}

      <div className="mt-5 flex gap-3">
        <button
          onClick={handleSaveDraft}
          disabled={loading}
          className="flex-1 rounded-full border border-black/15 py-3 text-sm font-medium text-navy-deeper hover:bg-black/5 disabled:opacity-60 dark:border-white/20 dark:text-white dark:hover:bg-white/5"
        >
          Save Draft
        </button>
        <button
          onClick={onClose}
          className="flex-1 rounded-full border border-black/15 py-3 text-sm font-medium text-navy-deeper hover:bg-black/5 dark:border-white/20 dark:text-white dark:hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          onClick={handleSend}
          disabled={loading}
          className="flex-1 rounded-full bg-teal py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {mode === "review" ? "Send for Review" : "Send Email"}
        </button>
      </div>
    </Modal>
  );
}
