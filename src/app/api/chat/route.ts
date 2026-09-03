import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { streamAssistantReply, type ChatTurn } from "@/lib/ai/gemini";

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
    messages,
  } = body as { sessionId: string | null; isTemporary: boolean; messages: ChatTurn[] };

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
    }
    if (activeSessionId) {
      await admin.from("chat_messages").insert({
        session_id: activeSessionId,
        user_id: user!.id,
        role: "user",
        message: lastUserMessage.text,
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
        for await (const chunk of streamAssistantReply(
          messages,
          upstreamController.signal,
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
    },
  });
}
