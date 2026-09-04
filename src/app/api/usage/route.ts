import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1"
  );
}

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

// Read-only peek at remaining quota — passing requested_count: 0 means the
// RPC's insert loop never runs, so this has no side effects on usage_tracking.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const ip = getClientIp(request);
  const userId = user?.id ?? null;
  const ipAddress = user ? null : ip;

  const [messages, documents] = await Promise.all([
    admin.rpc("check_and_record_usage", {
      p_user_id: userId,
      p_ip_address: ipAddress,
      p_action: "message",
      p_requested_count: 0,
    }),
    admin.rpc("check_and_record_usage", {
      p_user_id: userId,
      p_ip_address: ipAddress,
      p_action: "document",
      p_requested_count: 0,
    }),
  ]);

  const documentsRemaining: number | null = documents.data?.remaining ?? null;
  let documentsUnlockAt: string | null = null;

  if (documentsRemaining != null && documentsRemaining <= 0) {
    let query = admin
      .from("usage_tracking")
      .select("created_at")
      .eq("action", "document")
      .gt("created_at", new Date(Date.now() - FOUR_HOURS_MS).toISOString())
      .order("created_at", { ascending: true })
      .limit(1);
    query = userId ? query.eq("user_id", userId) : query.eq("ip_address", ipAddress).is("user_id", null);
    const { data: oldest } = await query.maybeSingle();
    if (oldest) {
      documentsUnlockAt = new Date(new Date(oldest.created_at).getTime() + FOUR_HOURS_MS).toISOString();
    }
  }

  return Response.json({
    messagesRemaining: messages.data?.remaining ?? null,
    documentsRemaining,
    documentsUnlockAt,
  });
}
