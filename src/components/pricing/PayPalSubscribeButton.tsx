"use client";

import Script from "next/script";
import { useState } from "react";

declare global {
  interface Window {
    paypal?: {
      HostedButtons: (opts: { hostedButtonId: string }) => { render: (sel: string) => void };
    };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const HOSTED_BUTTON_ID = process.env.NEXT_PUBLIC_PAYPAL_HOSTED_BUTTON_ID;

export function PayPalSubscribeButton({ containerId }: { containerId: string }) {
  const [ready, setReady] = useState(false);

  if (!CLIENT_ID || !HOSTED_BUTTON_ID) {
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
        src={`https://www.paypal.com/sdk/js?client-id=${CLIENT_ID}&components=hosted-buttons&disable-funding=venmo&currency=AUD`}
        strategy="afterInteractive"
        onReady={() => {
          window.paypal
            ?.HostedButtons({ hostedButtonId: HOSTED_BUTTON_ID })
            .render(`#${containerId}`);
          setReady(true);
        }}
      />
      <div id={containerId} />
      {!ready && (
        <button disabled className="w-full rounded-full bg-teal/40 py-3 text-sm font-semibold text-white">
          Loading…
        </button>
      )}
    </>
  );
}
