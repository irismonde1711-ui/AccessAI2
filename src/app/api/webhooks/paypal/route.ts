import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/paypal/verify";
import { grantSubscription } from "@/lib/data/subscription";

// Grants/renews access when a PayPal payment completes (spec §7.2).
//
// Every event is checked against PayPal's verification endpoint first. This
// fails closed: an unverified event grants nothing, because the alternative is
// letting anyone who finds this URL name an email address and award themselves
// a paid plan. A rejected event still returns 200 so PayPal stops retrying.
export async function POST(request: Request) {
  // Read once as text: verification needs the body exactly as delivered.
  const rawBody = await request.text();

  const verification = await verifyWebhookSignature(request.headers, rawBody);
  if (!verification.verified) {
    console.error(`[paypal] rejected webhook (${verification.reason})`);
    return Response.json({ ok: true, verified: false }, { status: 202 });
  }

  const body = (() => {
    try {
      return JSON.parse(rawBody);
    } catch {
      return null;
    }
  })();

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

  // Checkout normally grants access during the capture call, while the user is
  // still on the page. Re-running it here is harmless: the same order id is
  // recognised and the row is simply rewritten.
  const { data: claimed } = orderId
    ? await admin
        .from("subscriptions")
        .select("user_id, expires_at")
        .eq("paypal_order_id", orderId)
        .maybeSingle()
    : { data: null };
  if (claimed) return Response.json({ ok: true, alreadyGranted: true });

  await grantSubscription(admin, userId, { orderId, payerEmail, amount, currency });

  return Response.json({ ok: true });
}
