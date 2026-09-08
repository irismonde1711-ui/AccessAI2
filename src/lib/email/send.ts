// Outbound delivery via Resend's REST API. Kept to fetch rather than the SDK
// so there's no extra dependency for a single endpoint call.
//
// Delivery is optional: when no provider is configured the caller still records
// the send for audit and quota purposes, but must not claim it was delivered.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type DeliveryResult =
  | { delivered: true }
  | { delivered: false; reason: "not_configured" }
  | { delivered: false; reason: "provider_error"; detail: string };

export async function deliverEmail({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { delivered: false, reason: "not_configured" };

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text: body }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[email] Resend returned ${res.status}:`, detail.slice(0, 500));
    return { delivered: false, reason: "provider_error", detail: `${res.status} ${detail.slice(0, 200)}` };
  }

  return { delivered: true };
}
