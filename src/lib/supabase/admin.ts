import { createClient } from "@supabase/supabase-js";

// Service-role client for server-only code (webhooks, rate-limit checks,
// anything that must bypass RLS). Never import this from client components.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
