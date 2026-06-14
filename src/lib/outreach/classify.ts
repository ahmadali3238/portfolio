/** App-side reply classifier (free Groq/Gemini). Mirrors the worker's classify.ts. */

const LABELS = "interested, meeting_request, question, objection, not_now, referral, not_interested, auto_reply, unsubscribe, spam, other";

/** Bump when the classification prompt changes — stored in classification_raw. */
export const CLASSIFY_PROMPT_VERSION = "c1";

export interface Classification {
  classification: string;
  sentiment: "positive" | "neutral" | "negative";
  confidence: number;
  suggested_followup: string;
  promptVersion?: string;
}

async function groqJSON(system: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.OUTREACH_LLM_MODEL || "llama-3.3-70b-versatile",
      max_tokens: 500, response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const j: any = await res.json();
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  return j.choices?.[0]?.message?.content ?? "{}";
}

export async function classifyReply(replyText: string, company?: string): Promise<Classification> {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY not set");
  const system = "You are a precise sales-reply classifier. Output ONLY valid JSON.";
  const prompt = `Classify this reply to a cold email${company ? ` (company: ${company})` : ""}.

REPLY:
"""${(replyText || "").slice(0, 2000)}"""

Return JSON:
{"classification":"<one of: ${LABELS}>","sentiment":"positive|neutral|negative","confidence":0.0-1.0,"suggested_followup":"<short tailored reply, empty if unsubscribe/spam>"}`;
  const raw = (await groqJSON(system, prompt)).trim().replace(/^```json\s*|\s*```$/g, "");
  return { ...(JSON.parse(raw) as Classification), promptVersion: CLASSIFY_PROMPT_VERSION };
}
