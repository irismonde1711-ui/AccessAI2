import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidEmail } from "@/lib/validation";

// Records the send in emails_sent for audit purposes and enforces the
// email rate limit (spec §6). Actual outbound delivery needs an email
// provider (Resend/SendGrid/etc.) which isn't configured yet — the row is
// written so the audit trail and quota accounting are correct regardless.
export async function POST(request: Request) {
  const { toEmail, subject, body, type } = await request.json();

  if (!isValidEmail(toEmail ?? "")) {
    return Response.json({ error: "A valid recipient email is required" }, { status: 400 });
  }
  if (typeof body !== "string" || body.trim().length === 0) {
    return Response.json({ error: "Message body is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: usage, error: usageError } = await admin.rpc("check_and_record_usage", {
    p_user_id: user.id,
    p_ip_address: null,
    p_action: "email",
    p_requested_count: 1,
  });

  if (usageError) return Response.json({ error: usageError.message }, { status: 500 });
  if (!usage.allowed) {
    return Response.json({ error: "limit_reached", unlockAt: usage.unlock_at }, { status: 429 });
  }

  const { error } = await supabase.from("emails_sent").insert({
    user_id: user.id,
    to_email: toEmail,
    subject: subject || null,
    body,
    type: type === "review" ? "review" : "send",
  });

  await supabase
    .from("saved_recipients")
    .upsert(
      { user_id: user.id, email: toEmail, last_used: new Date().toISOString() },
      { onConflict: "user_id,email" },
    );

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
