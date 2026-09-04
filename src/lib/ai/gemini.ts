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
  if (!apiKey) {
    throw new Error("GOOGLE_GEMINI_API_KEY is not set");
  }
  console.log(
    `[gemini] using key: len=${apiKey.length} prefix=${apiKey.slice(0, 6)} hasWhitespace=${/\s/.test(apiKey)}`,
  );

  const requestBody = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
  });

  // This network path drops the initial TLS handshake intermittently
  // (observed ~50% failure rate), and Gemini itself occasionally returns
  // transient 429/503 "overloaded" errors. Retry both before giving up —
  // these are all pre-stream failures, never partial responses.
  const MAX_ATTEMPTS = 4;
  const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
  let res: Response | null = null;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const candidate = await fetch(`${GEMINI_URL}&key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]),
        body: requestBody,
      });

      console.log(`[gemini] attempt ${attempt}/${MAX_ATTEMPTS}: HTTP ${candidate.status}`);

      if (candidate.ok) {
        res = candidate;
        break;
      }

      if (!RETRYABLE_STATUS.has(candidate.status) || attempt === MAX_ATTEMPTS) {
        res = candidate;
        break;
      }
      lastError = new Error(`Gemini request failed: ${candidate.status}`);
    } catch (err) {
      console.log(
        `[gemini] attempt ${attempt}/${MAX_ATTEMPTS}: threw`,
        err instanceof Error ? err.message : err,
      );
      lastError = err;
      if (signal.aborted || attempt === MAX_ATTEMPTS) break;
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }

  if (!res) {
    throw lastError instanceof Error
      ? lastError
      : new Error("Gemini request failed after retries");
  }

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    console.error(`[gemini] HTTP ${res.status} from Gemini:`, detail.slice(0, 2000));
    throw new Error(`Gemini request failed: ${res.status} ${detail}`);
  }

  console.log(`[gemini] HTTP ${res.status} OK, streaming response…`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let yieldedAny = false;
  let lastParsed: unknown = null;

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
          yield text;
        }
      } catch {
        // Partial/malformed chunk — shouldn't happen with well-formed SSE framing.
      }
    }
  }

  if (!yieldedAny) {
    // A clean 200 stream that produced zero text usually means Gemini
    // blocked/filtered the response (safety, recitation, etc.) rather than
    // an actual network/API failure — log the last chunk so the real
    // reason (finishReason / promptFeedback) is visible in Vercel's logs.
    console.error(
      "[gemini] Stream completed with no text. Last parsed chunk:",
      JSON.stringify(lastParsed).slice(0, 2000),
    );
  }
}
