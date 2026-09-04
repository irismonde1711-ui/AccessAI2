import { createAdminClient } from "@/lib/supabase/admin";

// Grants/renews access when a PayPal payment completes (spec §7.2).
//
// SECURITY NOTE: this does not yet verify PayPal's webhook signature —
// that requires calling PayPal's /v1/notifications/verify-webhook-signature
// endpoint, which needs a REST client secret (not the public JS SDK
// client-id wired up so far) plus PAYPAL_WEBHOOK_ID. Until that's added,
// anyone who discovers this URL could POST a fabricated
// PAYMENT.CAPTURE.COMPLETED event naming any email and grant that account
// a free subscription. Add signature verification before relying on this
// in production.
const SUBSCRIPTION_DAYS = 30;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || body.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
    return Response.json({ ok: true });
  }

  const resource = body.resource ?? {};
  const payerEmail: string | undefined = resource.payer?.email_address;
  const orderId: string | undefined = resource.supplementary_data?.related_ids?.order_id;
  const amount: string | undefined = resource.amount?.value;
  const currency: string | undefined = resource.amount?.currency_code;

  if (!payerEmail) {
    return Response.json({ ok: true });
  }

  const admin = createAdminClient();
  const { data: userId } = await admin.rpc("find_user_id_by_email", {
    p_email: payerEmail,
  });

  if (!userId) {
    // No matching account — nothing to link the payment to. Still ack so
    // PayPal doesn't retry.
    return Response.json({ ok: true });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);

  const { data: existing } = await admin
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  const fields = {
    status: "active" as const,
    started_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    paypal_order_id: orderId ?? null,
    paypal_payer_email: payerEmail,
    ...(amount ? { amount } : {}),
    ...(currency ? { currency } : {}),
  };

  if (existing) {
    await admin.from("subscriptions").update(fields).eq("id", existing.id);
  } else {
    await admin.from("subscriptions").insert({ user_id: userId, plan: "essential", ...fields });
  }

  return Response.json({ ok: true });
}
