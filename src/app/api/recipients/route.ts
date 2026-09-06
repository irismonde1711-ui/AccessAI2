import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ recipients: [] });

  const { data } = await supabase
    .from("saved_recipients")
    .select("email, use_count")
    .eq("user_id", user.id)
    .order("last_used", { ascending: false })
    .limit(10);

  return Response.json({
    recipients: (data ?? []).map((r) => ({ email: r.email, useCount: r.use_count ?? 1 })),
  });
}
