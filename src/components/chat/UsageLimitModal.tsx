"use client";

import { Modal } from "@/components/ui/Modal";

export function UsageLimitModal({
  unlockAt,
  onClose,
  onUpgrade,
}: {
  unlockAt: string;
  onClose: () => void;
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
      <h2 className="font-display mt-5 text-2xl font-semibold text-white">
        You&apos;ve reached your free message limit
      </h2>
      <p className="mt-2 text-sm text-white/60">
        Free plans include 10 AI messages every 4 hours. Yours unlocks at{" "}
        <span className="font-medium text-white">{unlockTime}</span>, or
        subscribe now for unlimited access.
      </p>

      <button
        type="button"
        onClick={onUpgrade}
        className="mt-6 w-full rounded-full bg-teal py-3 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Upgrade to Essential
      </button>
    </Modal>
  );
}
