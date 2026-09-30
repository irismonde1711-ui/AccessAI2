import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "chat-attachments";

// Evidence and materials filed against a project. The browser uploads the
// object first (storage RLS already scopes it to the owner) and then records
// it here, where the upload allowance is enforced — a rejected upload is
// deleted again rather than left orphaned in the bucket.
export async function POST(request: Request) {
  const { projectId, category, filename, mimeType, sizeBytes, storagePath } = await request.json();

  if (category !== "evidence" && category !== "material") {
    return Response.json({ error: "Unknown category" }, { status: 400 });
  }
  if (typeof projectId !== "string" || typeof storagePath !== "string" || !filename) {
    return Response.json({ error: "projectId, storagePath and filename are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Storage RLS allows a path under the caller's own folder; make sure the
  // recorded path is one of those before anything else trusts it.
  if (!storagePath.startsWith(`${user.id}/`)) {
    return Response.json({ error: "Invalid storage path" }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("grc projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const { data: usage, error: usageError } = await admin.rpc("check_and_record_usage", {
    p_user_id: user.id,
    p_ip_address: null,
    p_action: "document",
    p_requested_count: 1,
  });
  if (usageError) return Response.json({ error: usageError.message }, { status: 500 });
  if (!usage.allowed) {
    await admin.storage.from(BUCKET).remove([storagePath]);
    return Response.json(
      { error: "document_limit_reached", unlockAt: usage.unlock_at },
      { status: 429 },
    );
  }

  const { data, error } = await supabase
    .from("project_files")
    .insert({
      project_id: projectId,
      user_id: user.id,
      category,
      filename,
      mime_type: mimeType ?? null,
      size_bytes: sizeBytes ?? null,
      storage_path: storagePath,
    })
    .select("id, category, filename")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ file: data });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: file } = await supabase
    .from("project_files")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!file) return Response.json({ error: "File not found" }, { status: 404 });

  await supabase.storage.from(BUCKET).remove([file.storage_path]);

  const { error } = await supabase.from("project_files").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}

// A signed URL so the owner can open what they filed; short-lived, because the
// bucket itself stays private.
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: file } = await supabase
    .from("project_files")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!file) return Response.json({ error: "File not found" }, { status: 404 });

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(file.storage_path, 60);
  if (error || !data) return Response.json({ error: "Could not open that file" }, { status: 500 });

  return Response.json({ url: data.signedUrl });
}
