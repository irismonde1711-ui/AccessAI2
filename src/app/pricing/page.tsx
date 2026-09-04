import { createClient } from "@/lib/supabase/server";
import { PricingPageClient } from "@/components/pricing/PricingPageClient";

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let fullName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    fullName = profile?.full_name ?? null;
  }

  return <PricingPageClient isLoggedIn={Boolean(user)} fullName={fullName} />;
}
