"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import type { SidebarData } from "@/lib/data/sidebar";

export function SearchConversationsModal({
  data,
  onClose,
  onSelectSession,
}: {
  data: SidebarData;
  onClose: () => void;
  onSelectSession: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const allSessions = useMemo(() => {
    const fromProjects = data.projects.flatMap((p) =>
      p.sessions.map((s) => ({ ...s, group: p.name })),
    );
    return [
      ...data.pinned.map((s) => ({ ...s, group: "Pinned" })),
      ...fromProjects,
      ...data.recent.map((s) => ({ ...s, group: "Recent" })),
    ];
  }, [data]);

  const filtered = query.trim()
    ? allSessions.filter((s) => s.title.toLowerCase().includes(query.trim().toLowerCase()))
    : allSessions;

  return (
    <Modal onClose={onClose}>
      <h2 className="font-display text-xl font-semibold text-navy-deeper dark:text-white">
        Search conversations
      </h2>
      <input
        autoFocus
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search pinned, projects and recent chats"
        className="modal-input mt-4 w-full rounded-xl px-4 py-3 text-sm text-navy-deeper outline-none focus:border-teal dark:text-white"
      />
      <div className="mt-4 max-h-80 space-y-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-grey dark:text-white/40">
            No conversations found.
          </p>
        )}
        {filtered.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelectSession(s.id)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/5"
          >
            <span className="truncate text-sm text-navy-deeper dark:text-white/85">{s.title}</span>
            <span className="ml-2 shrink-0 text-xs text-muted-grey dark:text-white/30">
              {s.group}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
