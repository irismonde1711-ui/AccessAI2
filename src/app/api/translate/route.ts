import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateText } from "@/lib/ai/gemini";

// The client works across Australia and West Africa, so an answer regularly
// has to be read by people on both sides. Retyping it into a translator loses
// the tables and headings that made it useful; this keeps them.
export const maxDuration = 60;

const LANGUAGES = {
  fr: "French",
  en: "English",
} as const;

type Target = keyof typeof LANGUAGES;

// Long enough for a board paper, short enough that nobody can push a book
// through it on the free allowance.
const MAX_CHARS = 20_000;

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
}

export async function POST(request: NextRequest) {
  const { text, target } = (await request.json().catch(() => ({}))) as {
    text?: string;
    target?: Target;
  };

  if (typeof text !== "string" || text.trim().length === 0) {
    return Response.json({ error: "Nothing to translate." }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return Response.json({ error: "That answer is too long to translate." }, { status: 413 });
  }
  if (!target || !(target in LANGUAGES)) {
    return Response.json({ error: "Unsupported language." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();

  // A translation is a model call like any other, so it is paid for out of the
  // same allowance rather than being a free way around it.
  const { data: usage, error: usageError } = await admin.rpc("check_and_record_usage", {
    p_user_id: user?.id ?? null,
    p_ip_address: user ? null : getClientIp(request),
    p_action: "message",
    p_requested_count: 1,
  });

  if (usageError) return Response.json({ error: usageError.message }, { status: 500 });
  if (!usage.allowed) {
    return Response.json({ error: "limit_reached", unlockAt: usage.unlock_at }, { status: 429 });
  }

  const language = LANGUAGES[target];

  try {
    const translated = await generateText(
      `You are a professional translator working on governance, risk and compliance material.
Translate everything the user sends into ${language}.

Rules:
- Reproduce the markdown exactly: the same headings, tables, lists, bold and code blocks, in the same order.
- Translate the content of table cells, not the table itself.
- Keep legislation names, standards, section numbers, organisation names and currency amounts as they are; add a short translation in brackets after a law's name the first time it appears.
- Use the formal register expected in professional correspondence.
- Return only the translation. No preamble, no notes, no explanation of what you did.`,
      text,
    );
    // The composer's counter is driven by this header, as it is for a chat
    // reply: a translation that quietly spent an allowance nobody saw go is
    // how people end up surprised by a limit.
    return Response.json(
      { text: translated },
      { headers: { "X-Messages-Remaining": usage.remaining == null ? "" : String(usage.remaining) } },
    );
  } catch (err) {
    console.error("[translate] failed:", err);
    return Response.json({ error: "The translation did not come through." }, { status: 502 });
  }
}
