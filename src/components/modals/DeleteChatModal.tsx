"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

// A conversation has no half-measure the way a project does: there is no
// folder to keep. One confirmation, then it and its messages are gone.
export function DeleteChatModal({
  session,
  onClose,
  onDeleted,
}: {
  session: { id: string; title: string };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/sessions/${encodeURIComponent(session.id)}`, {
      method: "DELETE",
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not delete that conversation.");
      return;
    }
    onDeleted();
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="font-display text-xl font-semibold text-navy-deeper dark:text-white">
        Delete “{session.title}”?
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-grey dark:text-white/60">
        The conversation, its messages and anything attached to them are erased. It cannot be
        undone.
      </p>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      <div className="mt-6 flex gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 rounded-full border border-black/10 py-2.5 text-sm font-medium text-navy-deeper transition hover:bg-black/5 disabled:opacity-60 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {loading ? "Deleting…" : "Delete conversation"}
        </button>
      </div>
    </Modal>
  );
}
