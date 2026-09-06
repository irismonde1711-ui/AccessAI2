import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Signups need email confirmation, so this callback — not the signup
      // form — is where a new account first has a session. Flag it so the
      // workspace can show the post-signup subscribe prompt (spec §8.9).
      const createdAt = data.user?.created_at;
      const lastSignInAt = data.user?.last_sign_in_at;
      const isFirstSignIn =
        Boolean(createdAt) &&
        (!lastSignInAt ||
          Math.abs(new Date(lastSignInAt).getTime() - new Date(createdAt!).getTime()) < 60_000);
      const destination = isFirstSignIn ? `${next}${next.includes("?") ? "&" : "?"}welcome=1` : next;
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
