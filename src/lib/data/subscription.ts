import type { SupabaseClient } from "@supabase/supabase-js";

// Mirrors the paid-subscriber bypass in spec §6.2: a row that is active and has
// not yet expired. Used both to unlock the UI and to authorise the more
// expensive model settings server-side.
export async function hasActiveSubscription(
  client: SupabaseClient,
  userId: string | null,
): Promise<boolean> {
  if (!userId) return false;

  const { data } = await client
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

export const SUBSCRIPTION_DAYS = 30;
export const PLAN_PRICE = "29.00";
export const PLAN_CURRENCY = "AUD";

type Payment = {
  orderId?: string | null;
  payerEmail?: string | null;
  amount?: string | null;
  currency?: string | null;
};

// Grants (or extends) paid access. Called from two places: the checkout
// capture, which knows exactly who paid because they are signed in, and the
// webhook, which has to match on the PayPal email. Paying again while still
// active adds to the remaining time rather than throwing it away.
export async function grantSubscription(
  admin: SupabaseClient,
  userId: string,
  payment: Payment,
): Promise<string> {
  const now = new Date();

  const { data: existing } = await admin
    .from("subscriptions")
    .select("id, expires_at, status")
    .eq("user_id", userId)
    .maybeSingle();

  const currentExpiry =
    existing?.status === "active" && existing.expires_at
      ? new Date(existing.expires_at)
      : null;
  const from = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const expiresAt = new Date(from.getTime() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);

  const fields = {
    status: "active" as const,
    started_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    paypal_order_id: payment.orderId ?? null,
    paypal_payer_email: payment.payerEmail ?? null,
    ...(payment.amount ? { amount: payment.amount } : {}),
    ...(payment.currency ? { currency: payment.currency } : {}),
  };

  if (existing) {
    await admin.from("subscriptions").update(fields).eq("id", existing.id);
  } else {
    await admin.from("subscriptions").insert({ user_id: userId, plan: "essential", ...fields });
  }

  return expiresAt.toISOString();
}
