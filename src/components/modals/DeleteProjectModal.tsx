"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

// Two different intentions share one word. Clearing the sidebar is reversible
// — the project waits in the bin with everything still in it — while clearing
// out a matter is not, so that path asks a second time. A project already in
// the bin only has the second choice left.
export function DeleteProjectModal({
  project,
  onClose,
  onDeleted,
}: {
  project: {
    id: string;
    name: string;
    sessionCount: number;
    fileCount: number;
    permanentOnly?: boolean;
  };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"folder" | "purge" | null>(null);
  const [confirmingPurge, setConfirmingPurge] = useState(Boolean(project.permanentOnly));

  const { sessionCount, fileCount } = project;
  const chats = `${sessionCount} ${sessionCount === 1 ? "conversation" : "conversations"}`;
  const docs = `${fileCount} ${fileCount === 1 ? "file" : "files"}`;
  const holdings = [sessionCount > 0 ? chats : null, fileCount > 0 ? docs : null]
    .filter(Boolean)
    .join(" and ");

  async function handleDelete(purge: boolean) {
    setError(null);
    setLoading(purge ? "purge" : "folder");
    const res = await fetch(
      `/api/grc grc projects?id=${encodeURIComponent(project.id)}${purge ? "&purge=1" : ""}`,
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
          This erases the project and {holdings || "its contents"} — every message and every
          uploaded document with it. It cannot be undone.
        </p>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => (project.permanentOnly ? onClose() : setConfirmingPurge(false))}
            disabled={loading !== null}
            className="flex-1 rounded-full border border-black/10 py-2.5 text-sm font-medium text-navy-deeper transition hover:bg-black/5 disabled:opacity-60 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
          >
            {project.permanentOnly ? "Cancel" : "Go back"}
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
        {holdings
          ? `This project holds ${holdings}. Choose what happens next.`
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
            {loading === "folder" ? "Moving to bin…" : "Move to bin"}
          </span>
          <span className="mt-1 block text-[13px] leading-relaxed text-muted-grey dark:text-white/55">
            The project leaves the sidebar with its conversations and files still inside, and can
            be restored from the bin at any time.
          </span>
        </button>

        <button
          onClick={() => setConfirmingPurge(true)}
          disabled={loading !== null}
          className="w-full rounded-2xl border border-red-500/30 bg-red-500/[0.04] p-4 text-left transition hover:bg-red-500/10 disabled:opacity-60"
        >
          <span className="block text-sm font-semibold text-red-500">Delete permanently</span>
          <span className="mt-1 block text-[13px] leading-relaxed text-muted-grey dark:text-white/55">
            The project, its conversations, evidence and materials are erased for good.
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
