// Google Ads conversion reporting.
//
// The tag in the root layout only records that a visit happened. These two
// calls are what tell Google which of those visits turned into an account and
// which into a payment — without them the campaigns are spending blind, with
// no way to tell a wasted click from a customer.

const ADS_ID = "AW-18496797402";

// Conversion actions are created in the client's Google Ads account, and each
// one carries its own label. They are public values — they ship in the page
// source of every site that reports conversions.
const SIGN_UP_LABEL = "5kirCMSnj6IdENr1-vNE";
// Supplied separately; until it arrives the purchase call is a no-op rather
// than a conversion reported against the wrong action.
const PURCHASE_LABEL = "";

const CURRENCY = "AUD";

// Matches the condition the tag itself is loaded under. Local testing would
// otherwise land in the client's advertising reports as real conversions.
const ENABLED = process.env.NODE_ENV === "production";

type Gtag = (command: string, action: string, params: Record<string, unknown>) => void;

// Signing up is one of the first things that can happen on a page, and the tag
// loads afterInteractive — so gtag may not exist yet at the moment there is a
// conversion to report. Calling a function that is not there yet would lose it
// silently, which is the failure this whole file exists to prevent.
const RETRY_MS = 300;
const GIVE_UP_AFTER_MS = 20_000;

function report(params: Record<string, unknown>, waitedMs = 0) {
  const send = (window as unknown as { gtag?: Gtag }).gtag;

  if (typeof send === "function") {
    send("event", "conversion", params);
    return;
  }

  // An ad blocker will never let the tag load, so this stops rather than
  // retrying for the life of the page.
  if (waitedMs >= GIVE_UP_AFTER_MS) return;
  window.setTimeout(() => report(params, waitedMs + RETRY_MS), RETRY_MS);
}

// A conversion reported twice is worse than one not reported at all: it
// inflates the numbers the ad budget is set from. Sign-up has no natural
// identifier to deduplicate on, so the browser remembers it did this.
const SIGN_UP_MARKER = "accessai2:signup-conversion";

export function trackSignUp() {
  if (!ENABLED || !SIGN_UP_LABEL) return;

  try {
    if (window.localStorage.getItem(SIGN_UP_MARKER)) return;
    window.localStorage.setItem(SIGN_UP_MARKER, "1");
  } catch {
    // Private browsing refuses storage; reporting the conversion still beats
    // losing it over a dedupe we cannot perform.
  }

  report({
    send_to: `${ADS_ID}/${SIGN_UP_LABEL}`,
    value: 1.0,
    currency: CURRENCY,
  });
}

// Payments carry the PayPal order id, which Google uses to discard a repeat of
// the same conversion itself — so a renewal next month is still counted, but a
// reloaded confirmation page is not.
export function trackPurchase(orderId: string, value: number) {
  if (!ENABLED || !PURCHASE_LABEL) return;

  report({
    send_to: `${ADS_ID}/${PURCHASE_LABEL}`,
    value,
    currency: CURRENCY,
    transaction_id: orderId,
  });
}
