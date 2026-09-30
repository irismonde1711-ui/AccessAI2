"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PlusIcon, SpinnerIcon, TrashIcon } from "@/components/ui/Icons";
import type { SidebarFile } from "@/lib/data/sidebar";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

// A project's paperwork: evidence on one side, reference material on the
// other. These are stored, not read by the assistant — filing a document here
// never sends it to the model.
// Shared by a project's own sections and by the Recent files list, so a file
// behaves the same wherever it is shown.
export async function openProjectFile(id: string): Promise<boolean> {
  const res = await fetch(`/api/grc grc projects/files?id=${encodeURIComponent(id)}`);
  if (!res.ok) return false;
  const { url } = await res.json();
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export async function deleteProjectFile(id: string): Promise<boolean> {
  const res = await fetch(`/api/grc grc projects/files?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return res.ok;
}

export function ProjectLibrary({
  projectId,
  evidence,
  materials,
  onChanged,
  onUploadLimit,
}: {
  projectId: string;
  evidence: SidebarFile[];
  materials: SidebarFile[];
  onChanged: () => void;
  onUploadLimit: (unlockAt: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  // The file currently going up, kept with its section so the list can show it
  // arriving. One upload at a time keeps the allowance honest.
  const [uploading, setUploading] = useState<{ category: string; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const busy = uploading !== null || deletingId !== null;

  async function upload(file: File, category: "evidence" | "material") {
    setError(null);

    if (file.size > MAX_FILE_BYTES) {
      setError(`${file.name} is over the 10MB limit.`);
      return;
    }

    setUploading({ category, name: file.name });
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Log in to upload files.");

      // Storage RLS requires the owner's id as the first path segment.
      const storagePath = `${user.id}/grc grc projects/${projectId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(storagePath, file, { contentType: file.type });
      if (uploadError) throw new Error(`Couldn't upload ${file.name}.`);

      const res = await fetch("/api/grc grc projects/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          category,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          storagePath,
        }),
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        onUploadLimit(data.unlockAt);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn't save that file.");
      }
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(null);
    }
  }

  async function remove(id: string) {
    setError(null);
    setDeletingId(id);
    const ok = await deleteProjectFile(id);
    setDeletingId(null);
    if (!ok) {
      setError("Couldn't delete that file.");
      return;
    }
    onChanged();
  }

  async function open(id: string) {
    if (!(await openProjectFile(id))) setError("Couldn't open that file.");
  }

  return (
    <>
      <FileSection
        label="Evidence"
        files={evidence}
        busy={busy}
        uploadingName={uploading?.category === "evidence" ? uploading.name : null}
        deletingId={deletingId}
        onUpload={(f) => upload(f, "evidence")}
        onOpen={open}
        onRemove={remove}
      />
      <FileSection
        label="Materials"
        files={materials}
        busy={busy}
        uploadingName={uploading?.category === "material" ? uploading.name : null}
        deletingId={deletingId}
        onUpload={(f) => upload(f, "material")}
        onOpen={open}
        onRemove={remove}
      />
      {error && <p className="px-2 pb-1 text-[11px] text-red-300">{error}</p>}
    </>
  );
}

function FileSection({
  label,
  files,
  busy,
  uploadingName,
  deletingId,
  onUpload,
  onOpen,
  onRemove,
}: {
  label: string;
  files: SidebarFile[];
  busy: boolean;
  uploadingName: string | null;
  deletingId: string | null;
  onUpload: (file: File) => void;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mt-1.5">
      <div className="flex items-center justify-between px-2 py-0.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.13em] text-white/35">
          {label}
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label={`Add ${label.toLowerCase()}`}
          className="text-white/40 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {uploadingName ? <SpinnerIcon size={13} /> : <PlusIcon size={13} />}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onUpload(file);
        }}
      />

      {uploadingName && (
        <div className="flex items-center gap-1.5 px-2 py-1 text-[12.5px] text-white/45">
          <SpinnerIcon size={12} />
          <span className="min-w-0 flex-1 truncate">Uploading {uploadingName}…</span>
        </div>
      )}

      {files.length === 0 && !uploadingName ? (
        <p className="px-2 pb-0.5 text-[11px] text-white/25">Nothing filed yet</p>
      ) : (
        files.map((file) => (
          <div
            key={file.id}
            className="group/file flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/5"
          >
            <span className="w-3.5 shrink-0" aria-hidden />
            <button
              onClick={() => onOpen(file.id)}
              disabled={deletingId === file.id}
              className="min-w-0 flex-1 truncate text-left text-[12.5px] text-white/70 disabled:opacity-40"
              title={file.filename}
            >
              {file.filename}
            </button>
            <button
              onClick={() => onRemove(file.id)}
              disabled={busy}
              aria-label={`Delete ${file.filename}`}
              className={`shrink-0 text-white/35 transition hover:text-red-300 disabled:cursor-not-allowed disabled:hover:text-white/35 ${
                deletingId === file.id ? "opacity-100" : "opacity-0 group-hover/file:opacity-100"
              }`}
            >
              {deletingId === file.id ? <SpinnerIcon size={12} /> : <TrashIcon size={12} />}
            </button>
          </div>
        ))
      )}
    </div>
  );
}

// What is left when a project folder is removed: the files survive, listed on
// their own until they are opened, deleted, or the account is done with them.
export function UnfiledFiles({
  files,
  onChanged,
}: {
  files: SidebarFile[];
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <div className="px-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="group/file flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5"
        >
          <span className="w-3.5 shrink-0" aria-hidden />
          <button
            onClick={async () => {
              if (!(await openProjectFile(file.id))) setError("Couldn't open that file.");
            }}
            disabled={deletingId === file.id}
            className="min-w-0 flex-1 truncate text-left text-[12.5px] text-white/70 disabled:opacity-40"
            title={file.filename}
          >
            {file.filename}
          </button>
          <span className="shrink-0 text-[9.5px] uppercase tracking-wide text-white/25">
            {file.category === "evidence" ? "EV" : "MA"}
          </span>
          <button
            onClick={async () => {
              setError(null);
              setDeletingId(file.id);
              const ok = await deleteProjectFile(file.id);
              setDeletingId(null);
              if (ok) onChanged();
              else setError("Couldn't delete that file.");
            }}
            disabled={deletingId !== null}
            aria-label={`Delete ${file.filename}`}
            className={`shrink-0 text-white/35 transition hover:text-red-300 disabled:cursor-not-allowed disabled:hover:text-white/35 ${
              deletingId === file.id ? "opacity-100" : "opacity-0 group-hover/file:opacity-100"
            }`}
          >
            {deletingId === file.id ? <SpinnerIcon size={12} /> : <TrashIcon size={12} />}
          </button>
        </div>
      ))}
      {error && <p className="px-2 pb-1 text-[11px] text-red-300">{error}</p>}
    </div>
  );
}
