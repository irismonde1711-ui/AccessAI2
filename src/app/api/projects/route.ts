import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { name, color } = await request.json();
  if (typeof name !== "string" || name.trim().length === 0) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: user.id, name: name.trim(), color: color || "#00B09B" })
    .select("id, name, color")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ project: data });
}

// Removing a project unfiles its chats by default: the project_sessions rows
// cascade away with the project, so the conversations reappear under Recent.
//
// `purge=1` is the other half of that choice — the conversations, their
// messages and any uploaded files go too, and none of it comes back.
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const purge = searchParams.get("purge") === "1";
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (purge) {
    const { data: links } = await supabase
      .from("project_sessions")
      .select("session_id")
      .eq("project_id", id);
    const sessionIds = (links ?? []).map((l) => l.session_id);

    if (sessionIds.length > 0) {
      // Storage is not covered by the database cascade, so the attachment
      // objects have to be named and removed before the rows that point at
      // them disappear.
      const { data: messages } = await supabase
        .from("chat_messages")
        .select("attachments")
        .in("session_id", sessionIds)
        .not("attachments", "is", null);

      const paths = (messages ?? []).flatMap((m) =>
        Array.isArray(m.attachments)
          ? (m.attachments as { storage_path?: string }[])
              .map((a) => a?.storage_path)
              .filter((p): p is string => Boolean(p))
          : [],
      );
      if (paths.length > 0) await supabase.storage.from("chat-attachments").remove(paths);

      const { error: sessionError } = await supabase
        .from("chat_sessions")
        .delete()
        .in("id", sessionIds)
        .eq("user_id", user.id);
      if (sessionError) return Response.json({ error: sessionError.message }, { status: 500 });
    }
  }

  // Evidence and materials belong to the project either way — the rows cascade
  // with it, so their storage objects have to be cleared here or they are
  // orphaned in the bucket forever.
  const { data: libraryFiles } = await supabase
    .from("project_files")
    .select("storage_path")
    .eq("project_id", id);
  const libraryPaths = (libraryFiles ?? []).map((f) => f.storage_path).filter(Boolean);
  if (libraryPaths.length > 0) {
    await supabase.storage.from("chat-attachments").remove(libraryPaths);
  }

  const { error } = await supabase.from("projects").delete().eq("id", id).eq("user_id", user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
