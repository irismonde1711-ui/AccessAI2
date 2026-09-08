// Outbound delivery via Resend's REST API. Kept to fetch rather than the SDK
// so there's no extra dependency for a single endpoint call.
//
// Delivery is optional: when no provider is configured the caller still records
// the send for audit and quota purposes, but must not claim it was delivered.

import { marked } from "marked";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Assistant replies are markdown, so a text-only send delivers raw pipes and
// asterisks where the recipient expects a table. Send both parts and let the
// client pick: HTML where supported, the original markdown as the fallback.
function renderHtml(body: string): string {
  const content = marked.parse(body, { async: false, gfm: true, breaks: true });
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f5f7fb">
    <div style="max-width:600px;margin:0 auto;padding:28px;background:#fff;border-radius:12px;border:1px solid #e5e8f0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#00124a">
      ${content}
    </div>
  </body>
</html>`;
}

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
    body: JSON.stringify({ from, to: [to], subject, text: body, html: renderHtml(body) }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[email] Resend returned ${res.status}:`, detail.slice(0, 500));
    return { delivered: false, reason: "provider_error", detail: `${res.status} ${detail.slice(0, 200)}` };
  }

  return { delivered: true };
}
