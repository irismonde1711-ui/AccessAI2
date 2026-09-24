"use client";

import Script from "next/script";
import { useCallback, useRef, useState } from "react";

type PayPalButtons = (opts: {
  style?: Record<string, string | number>;
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onCancel?: () => void;
  onError?: (err: unknown) => void;
}) => { render: (target: HTMLElement) => Promise<void> };

declare global {
  interface Window {
    paypal?: { Buttons: PayPalButtons };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

// Checkout runs against our own API rather than a hosted button, so the app
// knows the moment a payment succeeds: the order is created for the signed-in
// account and captured server-side, which is what unlocks Pro.
export function PayPalSubscribeButton({
  onSuccess,
}: {
  onSuccess: (expiresAt: string) => void;
}) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rendered = useRef(false);
  const hostRef = useRef<HTMLDivElement | null>(null);

  const mount = useCallback(
    (host: HTMLDivElement | null) => {
      if (!host || rendered.current || !window.paypal) return;
      rendered.current = true;

      window.paypal
        .Buttons({
          style: { shape: "pill", color: "gold", label: "pay", height: 45 },
          createOrder: async () => {
            setError(null);
            const res = await fetch("/api/paypal/orders", { method: "POST" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Could not start the payment.");
            return data.id as string;
          },
          onApprove: async ({ orderID }) => {
            setBusy(true);
            try {
              const res = await fetch("/api/paypal/orders/capture", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: orderID }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(data.error ?? "The payment did not complete.");
              onSuccess(data.expiresAt as string);
            } catch (err) {
              setError(
                err instanceof Error
                  ? `${err.message} If you were charged, contact support and we'll sort it out.`
                  : "Something went wrong finishing the payment.",
              );
            } finally {
              setBusy(false);
            }
          },
          onCancel: () => setError(null),
          onError: () => setError("PayPal could not process that. Please try again."),
        })
        .render(host)
        .then(() => setReady(true))
        .catch(() => setError("PayPal could not load. Please refresh and try again."));
    },
    [onSuccess],
  );

  if (!CLIENT_ID) {
    return (
      <button
        disabled
        className="w-full rounded-full bg-teal/40 py-3 text-sm font-semibold text-white"
        title="PayPal isn't configured yet"
      >
        Subscribe (coming soon)
      </button>
    );
  }

  return (
    <>
      <Script
        src={`https://www.paypal.com/sdk/js?client-id=${CLIENT_ID}&currency=AUD&intent=capture&disable-funding=venmo,paylater`}
        strategy="afterInteractive"
        onReady={() => mount(hostRef.current)}
      />
      <div
        ref={(node) => {
          hostRef.current = node;
          mount(node);
        }}
      />
      {!ready && !error && (
        <button disabled className="w-full rounded-full bg-teal/40 py-3 text-sm font-semibold text-white">
          Loading…
        </button>
      )}
      {busy && (
        <p className="mt-2 text-center text-xs text-muted-grey dark:text-white/50">
          Confirming your payment…
        </p>
      )}
      {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}
    </>
  );
}
