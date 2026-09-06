"use client";

import { Modal } from "@/components/ui/Modal";
import { PayPalSubscribeButton } from "@/components/pricing/PayPalSubscribeButton";

// Shown once, straight after signup (spec §8 screen 9). The PayPal button needs
// its own container id so it can't collide with the one on the pricing page.
export function SubscribePromptModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <div className="text-center">
        <div className="mx-auto mb-[18px] flex h-[54px] w-[54px] items-center justify-center rounded-[18px] bg-teal/15 text-[22px] text-teal">
          ✓
        </div>
        <h2 className="mb-2 font-display text-[21px] font-semibold text-navy-deeper dark:text-white">
          Account created
        </h2>
        <p className="mx-auto mb-6 text-sm leading-relaxed text-muted-grey dark:text-white/60">
          You&apos;re on the free plan — 10 messages, 1 email send and 3 uploads every 4 hours. Go
          unlimited for $29.
        </p>

        <PayPalSubscribeButton containerId="paypal-container-signup" />

        <div className="mt-3.5 flex flex-col gap-2.5">
          <button
            onClick={onClose}
            className="w-full rounded-[13px] border border-black/10 bg-panel-grey py-2.5 text-[13.5px] text-navy-deeper transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            Already paid? Continue
          </button>
          <button
            onClick={onClose}
            className="w-full py-1.5 text-[13px] text-muted-grey transition hover:text-navy-deeper dark:text-white/50 dark:hover:text-white"
          >
            Maybe later — continue with free plan
          </button>
        </div>
      </div>
    </Modal>
  );
}
