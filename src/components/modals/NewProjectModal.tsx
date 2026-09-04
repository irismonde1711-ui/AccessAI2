"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

const COLORS = ["#00B09B", "#00338D", "#8B5CF6", "#F59E0B", "#EF4444"];

export function NewProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length === 0) {
      setError("Project name is required.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), color }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Couldn't create the project. Please try again.");
      return;
    }
    onCreated();
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="font-display text-2xl font-semibold text-navy-deeper dark:text-white">
        New project
      </h2>
      <p className="mt-2 text-sm text-muted-grey dark:text-white/60">
        Group related conversations — an engagement, a client, or a recurring workstream.
      </p>

      <form onSubmit={handleCreate} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-grey dark:text-white/40">
            Project name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. FY26 SMSF Audits"
            className="modal-input w-full rounded-xl px-4 py-3 text-sm text-navy-deeper outline-none focus:border-teal dark:text-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-grey dark:text-white/40">
            Colour
          </label>
          <div className="flex gap-3">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                className={`h-8 w-8 rounded-full transition ${color === c ? "ring-2 ring-navy-deeper ring-offset-2 ring-offset-white dark:ring-white dark:ring-offset-navy-deeper" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-black/15 py-3 text-sm font-medium text-navy-deeper hover:bg-black/5 dark:border-white/20 dark:text-white dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-full bg-teal py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
