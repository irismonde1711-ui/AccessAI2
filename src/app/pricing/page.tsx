import { createClient } from "@/lib/supabase/server";
import { PricingPageClient } from "@/components/pricing/PricingPageClient";
import { hasActiveSubscription } from "@/lib/data/subscription";

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let fullName: string | null = null;
  let isPaid = false;
  if (user) {
    const [{ data: profile }, paid] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      hasActiveSubscription(supabase, user.id),
    ]);
    fullName = profile?.full_name ?? null;
    isPaid = paid;
  }

  return <PricingPageClient isLoggedIn={Boolean(user)} fullName={fullName} isPaid={isPaid} />;
}
