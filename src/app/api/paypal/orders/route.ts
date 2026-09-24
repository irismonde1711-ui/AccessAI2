import { createClient } from "@/lib/supabase/server";
import { paypalAccessToken, paypalApiBase } from "@/lib/paypal/api";
import { PLAN_CURRENCY, PLAN_PRICE } from "@/lib/data/subscription";

// Starts a Pro checkout. The order is created server-side so the amount can't
// be edited in the browser, and it is tied to the signed-in account: the
// capture step grants access to whoever made this call, not to whichever email
// happens to be on the PayPal account.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Log in before subscribing." }, { status: 401 });

  const token = await paypalAccessToken();
  if (!token) return Response.json({ error: "Payments are not configured." }, { status: 503 });

  const res = await fetch(`${paypalApiBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: user.id,
          description: "AccessAI2 Pro — 30 days of unlimited use",
          amount: { currency_code: PLAN_CURRENCY, value: PLAN_PRICE },
        },
      ],
      application_context: {
        brand_name: "AccessAI2",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
      },
    }),
  });

  const order = await res.json();
  if (!res.ok || !order.id) {
    console.error(`[paypal] create order failed: ${res.status}`, JSON.stringify(order).slice(0, 500));
    return Response.json({ error: "PayPal could not start the payment." }, { status: 502 });
  }

  return Response.json({ id: order.id });
}
