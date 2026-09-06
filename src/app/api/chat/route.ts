import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { streamAssistantReply, type ChatTurn, type ResponseLength } from "@/lib/ai/gemini";
import { hasActiveSubscription } from "@/lib/data/subscription";

// Vercel defaults serverless functions to 10s; a thinking model streaming a
// long compliance answer needs considerably more than that before it finishes.
export const maxDuration = 60;

const ATTACHMENT_BUCKET = "chat-attachments";

// What the client sends after uploading straight to Storage. The file bytes
// never pass through this route — Vercel caps request bodies at 4.5MB, well
// under the 10MB per-file limit the spec allows.
type StoredAttachment = {
  storagePath: string;
  filename: string;
  mimeType: string;
};

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1"
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    sessionId = null,
    isTemporary = false,
    projectId = null,
    messages,
    attachments = [],
    responseLength = "auto",
  } = body as {
    sessionId: string | null;
    isTemporary: boolean;
    projectId?: string | null;
    messages: ChatTurn[];
    attachments?: StoredAttachment[];
    responseLength?: ResponseLength;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const ip = getClientIp(request);

  const { data: usage, error: usageError } = await admin.rpc(
    "check_and_record_usage",
    {
      p_user_id: user?.id ?? null,
      p_ip_address: user ? null : ip,
      p_action: "message",
      p_requested_count: 1,
    },
  );

  if (usageError) {
    return Response.json({ error: usageError.message }, { status: 500 });
  }
  if (!usage.allowed) {
    return Response.json(
      { error: "limit_reached", unlockAt: usage.unlock_at },
      { status: 429 },
    );
  }

  // Documents are a separate quota, counted per file rather than per message
  // (spec §6.2), so three files in one message consume three of the allowance.
  if (attachments.length > 0) {
    const { data: docUsage, error: docError } = await admin.rpc("check_and_record_usage", {
      p_user_id: user?.id ?? null,
      p_ip_address: user ? null : ip,
      p_action: "document",
      p_requested_count: attachments.length,
    });
    if (docError) return Response.json({ error: docError.message }, { status: 500 });
    if (!docUsage.allowed) {
      return Response.json(
        { error: "document_limit_reached", unlockAt: docUsage.unlock_at },
        { status: 429 },
      );
    }
  }

  const modelFiles = await Promise.all(
    attachments.map(async (a) => {
      const { data, error } = await admin.storage.from(ATTACHMENT_BUCKET).download(a.storagePath);
      if (error || !data) {
        console.error(`[chat] could not read attachment ${a.storagePath}:`, error?.message);
        return null;
      }
      const base64 = Buffer.from(await data.arrayBuffer()).toString("base64");
      return { mimeType: a.mimeType, data: base64 };
    }),
  );
  const files = modelFiles.filter((f): f is NonNullable<typeof f> => f !== null);

  const isPaidUser = await hasActiveSubscription(admin, user?.id ?? null);
  const shouldPersist = Boolean(user) && !isTemporary;
  let activeSessionId: string | null = sessionId;
  const lastUserMessage = messages[messages.length - 1];

  if (shouldPersist) {
    if (!activeSessionId) {
      const { data: session } = await admin
        .from("chat_sessions")
        .insert({
          user_id: user!.id,
          title: lastUserMessage.text.slice(0, 60) || "New Conversation",
        })
        .select("id")
        .single();
      activeSessionId = session?.id ?? null;

      if (activeSessionId && projectId) {
        const { data: project } = await admin
          .from("projects")
          .select("id")
          .eq("id", projectId)
          .eq("user_id", user!.id)
          .maybeSingle();
        if (project) {
          await admin
            .from("project_sessions")
            .insert({ project_id: projectId, session_id: activeSessionId });
        }
      }
    }
    if (activeSessionId) {
      await admin.from("chat_messages").insert({
        session_id: activeSessionId,
        user_id: user!.id,
        role: "user",
        message: lastUserMessage.text,
        attachments: attachments.length
          ? attachments.map((a) => ({
              storage_path: a.storagePath,
              filename: a.filename,
              mime_type: a.mimeType,
              content_type: a.mimeType.startsWith("image/") ? "image" : "document",
            }))
          : null,
      });
    }
  }

  const upstreamController = new AbortController();
  request.signal.addEventListener("abort", () => upstreamController.abort());

  let assistantText = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const turns = files.length
          ? messages.map((m, i) => (i === messages.length - 1 ? { ...m, files } : m))
          : messages;
        // The composer hides "detailed" from free accounts, but the request
        // body is client-supplied, so the entitlement is decided here.
        const effectiveLength: ResponseLength =
          responseLength === "detailed" && !isPaidUser ? "auto" : responseLength;
        for await (const chunk of streamAssistantReply(
          turns,
          upstreamController.signal,
          effectiveLength,
        )) {
          assistantText += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
        if (shouldPersist && activeSessionId) {
          await admin.from("chat_messages").insert({
            session_id: activeSessionId,
            user_id: user!.id,
            role: "assistant",
            message: assistantText,
          });
        }
      } catch (err) {
        console.error("chat stream error:", err);
        try {
          const message = err instanceof Error ? err.message : String(err);
          controller.enqueue(encoder.encode(` [GEMFAIL] ${message}`));
          controller.close();
        } catch {
          // already closed by cancel()
        }
        if (shouldPersist && activeSessionId && assistantText) {
          await admin.from("chat_messages").insert({
            session_id: activeSessionId,
            user_id: user!.id,
            role: "assistant",
            message: `${assistantText}\n\n[Response stopped]`,
          });
        }
      }
    },
    cancel() {
      upstreamController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Session-Id": activeSessionId ?? "",
      "X-Messages-Remaining": usage.remaining == null ? "" : String(usage.remaining),
    },
  });
}
