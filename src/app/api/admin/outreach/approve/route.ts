import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { rejectIfNotSameOrigin } from "@/lib/request-security";
import { setMessageStatus, setLeadStatus, skipLeadDraftMessages, restoreLeadDraftMessages, getMessageById } from "@/lib/outreach/repository";

export const dynamic = "force-dynamic";

/** Approve / skip a drafted message or lead. */
export async function POST(request: NextRequest) {
  const cross = rejectIfNotSameOrigin(request);
  if (cross) return cross;
  if (!getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { messageId, leadId, action } = await request.json();
    if (!["approve", "skip", "sent", "unsend", "restore"].includes(action)) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    if (action === "approve" && messageId) await setMessageStatus(messageId, "approved");
    if (action === "skip") {
      if (messageId) await setMessageStatus(messageId, "skipped");
      if (leadId) {
        await setLeadStatus(leadId, "skipped");
        await skipLeadDraftMessages(leadId); // otherwise its drafts stay in the review queue forever
      }
    }
    if (action === "sent") {
      // user opened the email to send it → record it so follow-ups + reply tracking work
      // and it counts toward the daily send total.
      if (messageId) await setMessageStatus(messageId, "sent");
      if (leadId) await setLeadStatus(leadId, "sent");
    }
    if (action === "restore" && leadId) {
      // undo a "skip": bring the lead back into the review queue with its drafts restored.
      await setLeadStatus(leadId, "drafted");
      await restoreLeadDraftMessages(leadId);
    }
    if (action === "unsend") {
      // undo an accidental "sent" (opened but didn't actually send). A follow-up's lead
      // must return to "sent" (the initial email DID go out), not "drafted" — otherwise
      // one undo silently removes the lead from the follow-up sequence.
      if (messageId) {
        const msg = await getMessageById(messageId);
        await setMessageStatus(messageId, "draft");
        if (leadId) await setLeadStatus(leadId, msg?.kind === "followup" ? "sent" : "drafted");
      }
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
