import { createClient } from "@/lib/supabase/server";
import { HomeShell } from "@/components/home/HomeShell";
import { getSidebarData, type SidebarData } from "@/lib/data/sidebar";
import { hasActiveSubscription } from "@/lib/data/subscription";

const EMPTY_SIDEBAR: SidebarData = { pinned: [], projects: [], drafts: [], recent: [] };

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let fullName: string | null = null;
  let sidebarData: SidebarData = EMPTY_SIDEBAR;
  let isPaid = false;

  if (user) {
    const [{ data: profile }, sidebar, paid] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      getSidebarData(supabase, user.id),
      hasActiveSubscription(supabase, user.id),
    ]);
    fullName = profile?.full_name ?? null;
    sidebarData = sidebar;
    isPaid = paid;
  }

  return (
    <HomeShell
      fullName={fullName}
      email={user?.email ?? null}
      sidebarData={sidebarData}
      isPaid={isPaid}
    />
  );
}
