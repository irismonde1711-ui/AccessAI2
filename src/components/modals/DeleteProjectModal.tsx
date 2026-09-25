"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

// Two different intentions share one word. Tidying the sidebar keeps the work;
// clearing out a matter destroys it. The modal makes the user pick, and the
// permanent option asks a second time because nothing brings it back.
export function DeleteProjectModal({
  project,
  onClose,
  onDeleted,
}: {
  project: { id: string; name: string; sessionCount: number };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"folder" | "purge" | null>(null);
  const [confirmingPurge, setConfirmingPurge] = useState(false);

  const { sessionCount } = project;
  const chats = `${sessionCount} ${sessionCount === 1 ? "conversation" : "conversations"}`;

  async function handleDelete(purge: boolean) {
    setError(null);
    setLoading(purge ? "purge" : "folder");
    const res = await fetch(
      `/api/projects?id=${encodeURIComponent(project.id)}${purge ? "&purge=1" : ""}`,
      { method: "DELETE" },
    );
    setLoading(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not delete that project.");
      return;
    }
    onDeleted();
  }

  if (confirmingPurge) {
    return (
      <Modal onClose={onClose}>
        <h2 className="font-display text-xl font-semibold text-navy-deeper dark:text-white">
          Permanently delete “{project.name}”?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-grey dark:text-white/60">
          This deletes the project along with {sessionCount > 0 ? chats : "its contents"}, every
          message inside, and every file filed under Evidence or Materials. It cannot be
          undone.
        </p>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setConfirmingPurge(false)}
            className="flex-1 rounded-full border border-black/10 py-2.5 text-sm font-medium text-navy-deeper transition hover:bg-black/5 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
          >
            Go back
          </button>
          <button
            onClick={() => handleDelete(true)}
            disabled={loading !== null}
            className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {loading === "purge" ? "Deleting…" : "Delete everything"}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="font-display text-xl font-semibold text-navy-deeper dark:text-white">
        Delete “{project.name}”?
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-grey dark:text-white/60">
        {sessionCount > 0
          ? `This project holds ${chats}. Choose what happens next.`
          : "This project is empty."}
      </p>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      <div className="mt-6 space-y-2.5">
        <button
          onClick={() => handleDelete(false)}
          disabled={loading !== null}
          className="w-full rounded-2xl border border-black/10 p-4 text-left transition hover:bg-black/[0.03] disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/5"
        >
          <span className="block text-sm font-semibold text-navy-deeper dark:text-white">
            {loading === "folder" ? "Removing…" : "Remove the folder only"}
          </span>
          <span className="mt-1 block text-[13px] leading-relaxed text-muted-grey dark:text-white/55">
            The conversations are kept and move back to Recent. Anything filed under Evidence
            or Materials is removed with the project.
          </span>
        </button>

        <button
          onClick={() => setConfirmingPurge(true)}
          disabled={loading !== null}
          className="w-full rounded-2xl border border-red-500/30 bg-red-500/[0.04] p-4 text-left transition hover:bg-red-500/10 disabled:opacity-60"
        >
          <span className="block text-sm font-semibold text-red-500">Delete permanently</span>
          <span className="mt-1 block text-[13px] leading-relaxed text-muted-grey dark:text-white/55">
            The project, its conversations, evidence and materials are erased.
          </span>
        </button>
      </div>

      <button
        onClick={onClose}
        className="mt-3 w-full py-2 text-[13px] text-muted-grey transition hover:text-navy-deeper dark:text-white/50 dark:hover:text-white"
      >
        Cancel
      </button>
    </Modal>
  );
}
