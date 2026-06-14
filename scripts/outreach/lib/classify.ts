/** Reply classification (§5): label an inbound reply + draft a tailored follow-up. Free. */
import { generateJSON } from "./llm";
import { PROFILE } from "./profile";

export interface Classification {
  classification: string;   // interested | meeting_request | question | objection | not_now | referral | not_interested | auto_reply | unsubscribe | spam | other
  sentiment: "positive" | "neutral" | "negative";
  confidence: number;
  suggested_followup: string;
  promptVersion?: string;
}

const LABELS = "interested, meeting_request, question, objection, not_now, referral, not_interested, auto_reply, unsubscribe, spam, other";

/** Bump when the classification prompt changes (mirrors src/lib/outreach/classify.ts). */
export const CLASSIFY_PROMPT_VERSION = "c1";

export async function classifyReply(replyText: string, context?: { company?: string; lastEmail?: string }): Promise<Classification> {
  const system = "You are a precise sales-reply classifier. Output ONLY valid JSON.";
  const p = `Classify this reply to ${PROFILE.name}'s cold email${context?.company ? ` (company: ${context.company})` : ""}.

REPLY:
"""${(replyText || "").slice(0, 2000)}"""

Return JSON:
{"classification":"<one of: ${LABELS}>",
 "sentiment":"positive|neutral|negative",
 "confidence":0.0-1.0,
 "suggested_followup":"<a short, tailored reply ${PROFILE.name} could send next; empty string if unsubscribe/spam>"}`;
  const result = await generateJSON<Classification>(system, p);
  return { ...result, promptVersion: CLASSIFY_PROMPT_VERSION };
}
