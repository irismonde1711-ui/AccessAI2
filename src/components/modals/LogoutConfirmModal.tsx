"use client";

import { Modal } from "@/components/ui/Modal";

export function LogoutConfirmModal({
  fullName,
  email,
  onClose,
  onConfirm,
}: {
  fullName: string | null;
  email: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const displayName = fullName ?? email ?? "";
  const initial = displayName.charAt(0).toUpperCase() || "?";

  return (
    <Modal onClose={onClose}>
      <h2 className="font-display text-xl font-semibold text-navy-deeper dark:text-white">
        Are you sure you want to log out?
      </h2>

      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal text-sm font-semibold text-white">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-navy-deeper dark:text-white">
            {fullName ?? email}
          </p>
          {fullName && (
            <p className="truncate text-xs text-muted-grey dark:text-white/50">{email}</p>
          )}
        </div>
      </div>

      <button
        onClick={onConfirm}
        className="mt-6 w-full rounded-full bg-navy-deeper py-3 text-sm font-semibold text-white hover:brightness-110 dark:bg-white dark:text-navy-deeper dark:hover:bg-white/90"
      >
        Log out
      </button>
      <button
        onClick={onClose}
        className="mt-2 w-full rounded-full border border-black/15 py-3 text-sm font-medium text-navy-deeper hover:bg-black/5 dark:border-white/20 dark:text-white dark:hover:bg-white/5"
      >
        Cancel
      </button>
    </Modal>
  );
}
