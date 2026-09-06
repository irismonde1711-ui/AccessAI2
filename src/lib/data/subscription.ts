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
