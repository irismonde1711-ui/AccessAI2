import { createClient } from "@/lib/supabase/server";
import { HomeShell } from "@/components/home/HomeShell";

export default async function Home() {
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

  return <HomeShell fullName={fullName} email={user?.email ?? null} />;
}
