"use client";

import { Modal } from "@/components/ui/Modal";

// Shown the instant a PayPal capture succeeds, so paying visibly changes
// something. The date comes back from the capture route rather than being
// recomputed here, so it matches what the database actually stored.
export function SubscriptionSuccessModal({
  expiresAt,
  onClose,
}: {
  expiresAt: string | null;
  onClose: () => void;
}) {
  const renewal = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Modal onClose={onClose}>
      <div className="text-center">
        <div className="mx-auto mb-[18px] flex h-[54px] w-[54px] items-center justify-center rounded-[18px] bg-teal/15 text-[24px] text-teal">
          ✓
        </div>
        <h2 className="mb-2 font-display text-[21px] font-semibold text-navy-deeper dark:text-white">
          You&apos;re on Pro
        </h2>
        <p className="mx-auto mb-5 text-sm leading-relaxed text-muted-grey dark:text-white/60">
          Payment received — thank you. Your account is unlocked
          {renewal ? ` until ${renewal}` : ""}. A receipt is on its way from PayPal.
        </p>

        <ul className="mb-6 space-y-2 rounded-2xl bg-panel-grey p-4 text-left text-sm text-navy-deeper dark:bg-white/5 dark:text-white/80">
          {[
            "Unlimited messages — no four-hour window",
            "Unlimited document uploads and email sends",
            "Detailed responses unlocked in the composer",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-teal">✓</span>
              {item}
            </li>
          ))}
        </ul>

        <button
          onClick={onClose}
          className="w-full rounded-full bg-teal py-3 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Start working
        </button>
      </div>
    </Modal>
  );
}
