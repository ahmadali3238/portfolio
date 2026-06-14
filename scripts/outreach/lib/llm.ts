/**
 * Free LLM client: Groq (default) + Gemini (fallback). Claude optional (only if a provider
 * is explicitly "anthropic" AND the key exists). Returns parsed JSON or raw text.
 * Ported from the proven draft.ts PoC (Groq path validated live).
 */

const GROQ_DEFAULT = "llama-3.3-70b-versatile";
const GEMINI_DEFAULT = "gemini-2.5-flash";
const ANTHROPIC_DEFAULT = "claude-haiku-4-5-20251001";

export function availableProviders(): string[] {
  const out: string[] = [];
  if (process.env.GROQ_API_KEY) out.push("groq");
  if (process.env.GEMINI_API_KEY) out.push("gemini");
  if (process.env.ANTHROPIC_API_KEY) out.push("anthropic");
  return out;
}

async function groq(system: string, prompt: string, json: boolean, model?: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: model || process.env.OUTREACH_LLM_MODEL || GROQ_DEFAULT,
      max_tokens: 1200, // analysis + email JSON (p2) needs more room than the old email-only shape
      ...(json ? { response_format: { type: "json_object" } } : {}),
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const j: any = await res.json();
  if (!res.ok) throw new Error(`Groq ${res.status}: ${JSON.stringify(j).slice(0, 200)}`);
  return j.choices?.[0]?.message?.content ?? "";
}

async function gemini(system: string, prompt: string, json: boolean, model?: string): Promise<string> {
  const m = model || GEMINI_DEFAULT;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY as string },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      // gemini-2.5 spends output budget on internal "thinking" — 800 truncates JSON mid-string
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048, ...(json ? { responseMimeType: "application/json" } : {}) },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const j: any = await res.json();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${JSON.stringify(j).slice(0, 200)}`);
  return j.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
}

async function anthropic(system: string, prompt: string, _json: boolean, model?: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY as string, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: model || process.env.ANTHROPIC_MODEL || ANTHROPIC_DEFAULT, max_tokens: 1500, system, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(60_000),
  });
  const j: any = await res.json();
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${JSON.stringify(j).slice(0, 200)}`);
  return j.content?.[0]?.text ?? "";
}

const CALLERS: Record<string, (s: string, p: string, j: boolean, m?: string) => Promise<string>> = { groq, gemini, anthropic };

/** Run with the configured provider order, falling back to any other available provider. */
async function run(system: string, prompt: string, json: boolean): Promise<string> {
  const primary = (process.env.OUTREACH_LLM_PROVIDER || "groq").toLowerCase();
  const premium = (process.env.OUTREACH_LLM_PREMIUM_PROVIDER || "gemini").toLowerCase();
  const order = [primary, premium, ...availableProviders()].filter((p, i, a) => a.indexOf(p) === i);
  let lastErr: unknown;
  for (const p of order) {
    if (!availableProviders().includes(p)) continue;
    try { return await CALLERS[p](system, prompt, json); }
    catch (e) { lastErr = e; console.error(`LLM ${p} failed, trying next:`, (e as Error).message); }
  }
  throw new Error(`All LLM providers failed. Last: ${(lastErr as Error)?.message || "no provider configured"}`);
}

export async function generateText(system: string, prompt: string): Promise<string> {
  return run(system, prompt, false);
}

export async function generateJSON<T = any>(system: string, prompt: string): Promise<T> {
  const raw = await run(system, prompt, true);
  const cleaned = raw.trim().replace(/^```json\s*|\s*```$/g, "");
  try { return JSON.parse(cleaned) as T; }
  catch { throw new Error(`LLM did not return valid JSON: ${raw.slice(0, 200)}`); }
}
