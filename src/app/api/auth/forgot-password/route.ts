import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidEmail } from "@/lib/validation";

const COOLDOWN_SECONDS = 60;
const GENERIC_MESSAGE =
  "If an account exists with that email, a reset link has been sent.";

export async function POST(request: Request) {
  const { email } = await request.json();

  if (typeof email !== "string" || !isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("password_reset_requests")
    .select("requested_at")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existing) {
    const elapsedMs = Date.now() - new Date(existing.requested_at).getTime();
    const remaining = COOLDOWN_SECONDS - Math.floor(elapsedMs / 1000);
    if (remaining > 0) {
      return NextResponse.json(
        { message: GENERIC_MESSAGE, cooldownRemaining: remaining },
        { status: 429 },
      );
    }
  }

  await admin.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${new URL(request.url).origin}/reset-password`,
  });

  await admin
    .from("password_reset_requests")
    .upsert({ email: normalizedEmail, requested_at: new Date().toISOString() });

  return NextResponse.json({
    message: GENERIC_MESSAGE,
    cooldownRemaining: COOLDOWN_SECONDS,
  });
}
