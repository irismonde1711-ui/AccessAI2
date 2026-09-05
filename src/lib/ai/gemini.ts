// Single integration point for all AI calls (chat, and later email drafting /
// peer review). The build spec's long-term plan is to route this through
// OpenRouter so switching models/providers is a config change; the client
// asked to go straight to the Gemini API for now. Everything outside this
// file only knows about `ChatTurn` and `streamAssistantReply` — swapping the
// implementation to call OpenRouter later shouldn't require touching any
// call site.

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;

export const SYSTEM_PROMPT = `You are AccessAI2, a professional business assistant for governance, HR, finance, tax, and ESG topics. You help with HR communications, financial statement review, ATO lodgement summaries, SMSF audit checklists, ESG frameworks, and GRC guidance.

Stay scoped to these professional/compliance domains — you are not a general-purpose chatbot. Be precise, cite the specific rule, section, or standard you're referencing where relevant, and format responses with clear markdown (headings, numbered steps, tables) so they're easy to scan in a business context.`;

export type ChatTurn = { role: "user" | "model"; text: string };

export async function* streamAssistantReply(
  turns: ChatTurn[],
  signal: AbortSignal,
): AsyncGenerator<string> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

  // Every failure path folds this trail into the thrown message so the real
  // cause reaches the browser console, not just the server logs.
  const trail: string[] = [];
  const note = (line: string) => {
    trail.push(line);
    console.log(`[gemini] ${line}`);
  };
  // Annotated so TypeScript treats it as never-returning and narrows after it.
  const fail: (summary: string) => never = (summary) => {
    throw new Error(`${summary} | diagnostics: ${trail.join(" ; ")}`);
  };

  if (!apiKey) {
    fail("GOOGLE_GEMINI_API_KEY is not set on this environment");
  }
  note(
    `key len=${apiKey.length} prefix=${apiKey.slice(0, 6)} suffix=${apiKey.slice(-4)} whitespace=${/\s/.test(apiKey)}`,
  );

  const requestBody = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
  });

  // Gemini occasionally returns transient 429/503 "overloaded" errors, and the
  // initial TLS handshake to this host drops intermittently on some networks.
  // Both are pre-stream failures, so retrying is always safe here.
  const MAX_ATTEMPTS = 4;
  const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
  // Guards time-to-headers only. It must NOT stay armed while the body
  // streams: a fetch signal in Node aborts the live response stream too, and
  // this model can think for far longer than any sane connect timeout before
  // emitting its first token.
  const HEADERS_TIMEOUT_MS = 15_000;
  let res: Response | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const headersTimer = new AbortController();
    const timeoutId = setTimeout(() => headersTimer.abort(), HEADERS_TIMEOUT_MS);
    try {
      const candidate = await fetch(`${GEMINI_URL}&key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.any([signal, headersTimer.signal]),
        body: requestBody,
      });
      clearTimeout(timeoutId);

      note(`attempt ${attempt}/${MAX_ATTEMPTS} responded HTTP ${candidate.status}`);

      if (candidate.ok || !RETRYABLE_STATUS.has(candidate.status) || attempt === MAX_ATTEMPTS) {
        res = candidate;
        break;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      const reason = headersTimer.signal.aborted
        ? `no response headers within ${HEADERS_TIMEOUT_MS}ms`
        : err instanceof Error
          ? `${err.name}: ${err.message}`
          : String(err);
      note(`attempt ${attempt}/${MAX_ATTEMPTS} threw (${reason})`);
      if (signal.aborted || attempt === MAX_ATTEMPTS) {
        fail("Could not reach Gemini");
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
  }

  if (!res) {
    fail("Could not reach Gemini");
  }

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "<unreadable body>");
    fail(`Gemini rejected the request with HTTP ${res.status}: ${detail.slice(0, 1000)}`);
  }

  note("headers received, reading stream");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let yieldedAny = false;
  let lastParsed: unknown = null;
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sepIndex: number;
    while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);

      const dataLine = rawEvent.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      const jsonStr = dataLine.slice(5).trim();
      if (!jsonStr) continue;

      try {
        const parsed = JSON.parse(jsonStr);
        lastParsed = parsed;
        const text: string = (parsed?.candidates?.[0]?.content?.parts ?? [])
          .map((p: { text?: string }) => p.text ?? "")
          .join("");
        if (text) {
          yieldedAny = true;
          fullText += text;
          yield text;
        }
      } catch {
        // Partial/malformed chunk — shouldn't happen with well-formed SSE framing.
      }
    }
  }

  if (yieldedAny) {
    note(`streamed ${fullText.length} chars`);
    return;
  }

  // The caller stopped it — an empty reply is the expected outcome, not a fault.
  if (signal.aborted) return;

  // A 200 stream that produced zero text means Gemini accepted the request but
  // returned nothing usable: a safety/recitation block, or an empty candidate
  // list. The last chunk carries finishReason / promptFeedback explaining which.
  note(`stream ended with no text, last chunk: ${JSON.stringify(lastParsed)?.slice(0, 1000)}`);
  fail("Gemini returned an empty response");
}
