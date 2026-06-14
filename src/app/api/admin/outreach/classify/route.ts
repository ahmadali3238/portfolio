import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { rejectIfNotSameOrigin } from "@/lib/request-security";
import { classifyReply } from "@/lib/outreach/classify";
import { saveReply, setLeadStatus } from "@/lib/outreach/repository";

export const dynamic = "force-dynamic";

/** Paste an inbound reply → classify with free LLM → store + suggest a follow-up. */
export async function POST(request: NextRequest) {
  const cross = rejectIfNotSameOrigin(request);
  if (cross) return cross;
  if (!getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { leadId, replyText, company } = await request.json();
    if (!replyText) return NextResponse.json({ error: "replyText required" }, { status: 400 });

    const c = await classifyReply(replyText, company);
    await saveReply({
      lead_id: leadId || null, raw_text: replyText,
      classification: c.classification, sentiment: c.sentiment,
      confidence: c.confidence, suggested_followup: c.suggested_followup, classification_raw: c as any,
    });
    if (leadId && !["unsubscribe", "spam", "auto_reply"].includes(c.classification)) {
      await setLeadStatus(leadId, "replied");
    } else if (leadId && c.classification === "unsubscribe") {
      await setLeadStatus(leadId, "skipped");
    }
    return NextResponse.json({ classification: c }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
