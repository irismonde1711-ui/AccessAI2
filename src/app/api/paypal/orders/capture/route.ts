import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paypalAccessToken, paypalApiBase } from "@/lib/paypal/api";
import { PLAN_CURRENCY, PLAN_PRICE, grantSubscription } from "@/lib/data/subscription";

// Takes the money and unlocks Pro in the same request, so the user sees the
// result immediately instead of waiting on the webhook. The webhook stays as a
// backstop for payments that complete after the browser has gone away.
export async function POST(request: Request) {
  const { orderId } = await request.json().catch(() => ({ orderId: null }));
  if (typeof orderId !== "string" || !orderId) {
    return Response.json({ error: "orderId is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Log in before subscribing." }, { status: 401 });

  const token = await paypalAccessToken();
  if (!token) return Response.json({ error: "Payments are not configured." }, { status: 503 });

  const res = await fetch(`${paypalApiBase()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      // Lets a retry of the same order return the original capture instead of
      // charging twice.
      "PayPal-Request-Id": orderId,
    },
  });

  const order = await res.json();
  if (!res.ok || order.status !== "COMPLETED") {
    console.error(`[paypal] capture failed: ${res.status}`, JSON.stringify(order).slice(0, 500));
    return Response.json({ error: "The payment did not complete." }, { status: 402 });
  }

  const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
  const paid = capture?.amount;
  if (!paid || paid.currency_code !== PLAN_CURRENCY || Number(paid.value) < Number(PLAN_PRICE)) {
    console.error(`[paypal] unexpected capture amount`, JSON.stringify(paid));
    return Response.json({ error: "The payment amount did not match the plan." }, { status: 402 });
  }

  const admin = createAdminClient();

  // One PayPal order unlocks one account. Without this, the same order id
  // could be replayed from another session to award a second subscription.
  const { data: claimed } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("paypal_order_id", order.id)
    .maybeSingle();
  if (claimed && claimed.user_id !== user.id) {
    return Response.json({ error: "That payment is already linked to another account." }, { status: 409 });
  }

  const expiresAt = await grantSubscription(admin, user.id, {
    orderId: order.id,
    payerEmail: order.payer?.email_address ?? null,
    amount: paid.value,
    currency: paid.currency_code,
  });

  return Response.json({ ok: true, expiresAt });
}
