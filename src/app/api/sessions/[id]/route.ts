import { createClient } from "@/lib/supabase/server";

// Deletes one conversation and everything hanging off it. The messages and any
// project link cascade in the database; the attachments uploaded to those
// messages have to be named and removed, or they linger in the bucket.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("attachments")
    .eq("session_id", id)
    .not("attachments", "is", null);

  const paths = (messages ?? []).flatMap((m) =>
    Array.isArray(m.attachments)
      ? (m.attachments as { storage_path?: string }[])
          .map((a) => a?.storage_path)
          .filter((p): p is string => Boolean(p))
      : [],
  );
  if (paths.length > 0) await supabase.storage.from("chat-attachments").remove(paths);

  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
