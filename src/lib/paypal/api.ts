// Shared PayPal REST plumbing: which environment to talk to, and an OAuth
// token for it. Both the checkout routes and the webhook verifier use these.

const LIVE_API = "https://api-m.paypal.com";
const SANDBOX_API = "https://api-m.sandbox.paypal.com";

export function paypalApiBase(): string {
  return process.env.PAYPAL_ENV === "sandbox" ? SANDBOX_API : LIVE_API;
}

export async function paypalAccessToken(): Promise<string | null> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    console.error("[paypal] missing PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET");
    return null;
  }

  const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    console.error(`[paypal] token request failed: ${res.status}`);
    return null;
  }

  const json = await res.json();
  return json.access_token ?? null;
}
