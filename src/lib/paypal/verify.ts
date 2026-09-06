// Verifies that a webhook really came from PayPal, by handing the delivery
// headers and the raw body back to PayPal's own verification endpoint.
//
// Without this, anyone who finds the webhook URL can POST a fabricated
// PAYMENT.CAPTURE.COMPLETED naming any email address and grant that account a
// paid subscription.

const LIVE_API = "https://api-m.paypal.com";
const SANDBOX_API = "https://api-m.sandbox.paypal.com";

function apiBase(): string {
  return process.env.PAYPAL_ENV === "sandbox" ? SANDBOX_API : LIVE_API;
}

export type VerifyOutcome =
  | { verified: true }
  | { verified: false; reason: "not_configured" | "missing_headers" | "rejected" | "error" };

async function accessToken(clientId: string, secret: string): Promise<string | null> {
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
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

export async function verifyWebhookSignature(
  headers: Headers,
  rawBody: string,
): Promise<VerifyOutcome> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  if (!clientId || !secret || !webhookId) {
    return { verified: false, reason: "not_configured" };
  }

  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const transmissionSig = headers.get("paypal-transmission-sig");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgo = headers.get("paypal-auth-algo");

  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    return { verified: false, reason: "missing_headers" };
  }

  const token = await accessToken(clientId, secret);
  if (!token) return { verified: false, reason: "error" };

  const res = await fetch(`${apiBase()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    // webhook_event must be the parsed body: PayPal re-serialises it their way.
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
  });

  if (!res.ok) {
    console.error(`[paypal] verification call failed: ${res.status}`);
    return { verified: false, reason: "error" };
  }

  const { verification_status: status } = await res.json();
  return status === "SUCCESS" ? { verified: true } : { verified: false, reason: "rejected" };
}
