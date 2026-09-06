import { createClient } from "@/lib/supabase/server";

// Reads back a single saved draft so it can be reopened for editing. RLS
// restricts the row to its owner, so no extra ownership check is needed here.
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("drafts")
    .select("id, type, title, content, to_email")
    .eq("id", id)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Draft not found" }, { status: 404 });
  return Response.json({ draft: data });
}

export async function POST(request: Request) {
  const { type, title, content, toEmail } = await request.json();
  if (type !== "ai_response" && type !== "email") {
    return Response.json({ error: "Invalid draft type" }, { status: 400 });
  }
  if (typeof content !== "string" || content.trim().length === 0) {
    return Response.json({ error: "Content is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("drafts")
    .insert({
      user_id: user.id,
      type,
      title: title || "Untitled Draft",
      content,
      to_email: toEmail || null,
    })
    .select("id, title, type")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ draft: data });
}
