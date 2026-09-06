import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidEmail } from "@/lib/validation";
import { deliverEmail } from "@/lib/email/send";

const DEFAULT_SUBJECT = "Message from your AccessAI2 workspace";
const REVIEW_PREFIX = "[Sent for Review] ";

// Records the send in emails_sent for audit and enforces the email rate limit
// (spec §6), then attempts delivery. The row is written regardless of delivery
// so the audit trail and quota accounting stay correct, but the response
// reports whether it actually went out — the UI must not claim otherwise.
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

  const isReview = type === "review";
  const baseSubject = typeof subject === "string" && subject.trim() ? subject.trim() : DEFAULT_SUBJECT;
  const finalSubject = isReview ? `${REVIEW_PREFIX}${baseSubject}` : baseSubject;

  const { error } = await supabase.from("emails_sent").insert({
    user_id: user.id,
    to_email: toEmail,
    subject: finalSubject,
    body,
    type: isReview ? "review" : "send",
  });

  await supabase
    .from("saved_recipients")
    .upsert(
      { user_id: user.id, email: toEmail, last_used: new Date().toISOString() },
      { onConflict: "user_id,email" },
    );

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const delivery = await deliverEmail({ to: toEmail, subject: finalSubject, body });
  return Response.json({
    ok: true,
    subject: finalSubject,
    delivered: delivery.delivered,
    reason: delivery.delivered ? undefined : delivery.reason,
  });
}
