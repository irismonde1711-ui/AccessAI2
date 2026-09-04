"use client";

import { Modal } from "@/components/ui/Modal";

export function UsageLimitModal({
  unlockAt,
  isLoggedIn,
  onClose,
  onCreateAccount,
  onUpgrade,
}: {
  unlockAt: string;
  isLoggedIn: boolean;
  onClose: () => void;
  onCreateAccount: () => void;
  onUpgrade: () => void;
}) {
  const unlockTime = new Date(unlockAt).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Modal onClose={onClose}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-light text-2xl">
        ⏳
      </div>
      <h2 className="font-display mt-5 text-2xl font-semibold text-navy-deeper dark:text-white">
        Message limit reached
      </h2>
      <p className="mt-2 text-sm text-muted-grey dark:text-white/60">
        You have used all 10 free messages in this four-hour window. Uploads and email sends are
        unaffected.
      </p>

      <div className="mt-5 flex items-center justify-between rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 dark:border-white/10 dark:bg-white/5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-grey dark:text-white/40">
            Unlocks at
          </p>
          <p className="text-lg font-semibold text-navy-deeper dark:text-white">{unlockTime}</p>
        </div>
        <p className="max-w-[9rem] text-right text-xs text-muted-grey dark:text-white/40">
          Free allowance resets every 4 hours
        </p>
      </div>

      {!isLoggedIn && (
        <button
          type="button"
          onClick={onCreateAccount}
          className="mt-6 w-full rounded-full border border-black/15 py-3 text-sm font-medium text-navy-deeper hover:bg-black/5 dark:border-white/20 dark:text-white dark:hover:bg-white/5"
        >
          Create a free account first
        </button>
      )}
      <button
        type="button"
        onClick={onUpgrade}
        className="mt-2 w-full rounded-full bg-teal py-3 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Subscribe for Unlimited Access
      </button>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full py-2 text-sm text-muted-grey hover:text-navy-deeper dark:text-white/50 dark:hover:text-white"
      >
        Close
      </button>
    </Modal>
  );
}
