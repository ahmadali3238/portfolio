/**
 * Stage 5 — FOLLOW-UP: for leads emailed ≥ N days ago with no reply, draft a short new-angle
 * bump (free LLM). Cadence = OUTREACH_FOLLOWUP_DAYS (e.g. 3,7,14). Manual-approve by default;
 * OUTREACH_AUTO_FOLLOWUP=1 + gmail mode sends automatically.
 * Run: pnpm outreach:followup
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { randomUUID } from "node:crypto";

import { loadConfig } from "./lib/config";
import { generateJSON } from "./lib/llm";
import { buildFooter } from "./lib/email-content";
import { applyTracking } from "./lib/tracking";
import { send } from "./lib/sender";
import { PROFILE } from "./lib/profile";
import { hasSupabaseConfig, getLeads, getMessages, insertMessage, updateMessage, updateLead, recordEvent } from "./lib/supabase";

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

async function bump(company: string, original: string, n: number): Promise<{ subject: string; body: string }> {
  const sys = "You write very short, polite follow-up emails. Output ONLY valid JSON.";
  const p = `${PROFILE.name} emailed ${company} ${n === 1 ? "once" : `${n} times`} with no reply. Write follow-up #${n + 1}: ` +
    `2-3 sentences, a FRESH angle (don't repeat), friendly, one soft CTA. Reference the original lightly.\n\n` +
    `ORIGINAL:\n"""${original.slice(0, 500)}"""\n\nReturn JSON: {"subject":"...","body":"..."}`;
  return generateJSON(sys, p);
}

async function main() {
  const cfg = loadConfig();
  if (!hasSupabaseConfig()) { console.log("⚠️ Supabase not configured — followup needs the DB."); return; }

  const leads = await getLeads({ status: "sent", limit: 100, order: "score.desc" });
  let made = 0, sent = 0;

  for (const l of leads) {
    // local "no website" leads are a WhatsApp/phone manual flow — the email-shaped bump below
    // doesn't fit (and they have no email). Re-contact is done by hand from the dashboard.
    if (l.segment === "local_no_website") continue;
    const msgs = await getMessages({ leadId: l.id, limit: 20 });
    const sentMsgs = msgs.filter((m) => m.status === "sent").sort((a, b) => (a.sent_at > b.sent_at ? 1 : -1));
    if (!sentMsgs.length) continue;
    const last = sentMsgs[sentMsgs.length - 1];
    if (msgs.some((m) => m.kind === "followup" && m.status === "draft")) continue; // a bump is already pending review — don't stack another
    const followupCount = msgs.filter((m) => m.kind === "followup").length;
    if (followupCount >= cfg.followupDays.length) continue;                 // sequence exhausted
    const dueAfter = cfg.followupDays[followupCount];
    if (!last.sent_at || daysSince(last.sent_at) < dueAfter) continue;       // not due yet

    const b = await bump(l.company_name, sentMsgs[0].body, followupCount + 1);
    // full post text + the initial email's LLM-detected link asks, so requested links
    // (GitHub etc.) survive into follow-up footers exactly as they appeared in email #1
    const postText = [l.signal, (l.signal_raw as any)?.description].filter(Boolean).join("\n");
    const extraLinks = ((sentMsgs[0].ai_meta as any)?.analysis?.links_requested as string[] | undefined) || [];
    const body = `${b.body.trim()}\n${buildFooter(cfg, postText, { extraLinks })}`;
    made++;
    console.log(`  ✎ follow-up #${followupCount + 1} for ${l.company_name}`);
    if (cfg.dryRun) continue;

    const token = randomUUID().replace(/-/g, "").slice(0, 20);
    const msg = await insertMessage({
      lead_id: l.id, kind: "followup", sequence: followupCount + 1,
      subject: b.subject, body, status: "draft", tracking_token: token,
    });

    if (cfg.autoFollowup && (cfg.sendMode === "gmail" || cfg.sendMode === "smtp") && l.email) {
      // same gate as send.ts — visible tracked redirects are opt-in only
      const r = await send({ to: l.email, subject: b.subject, body: cfg.trackLinks ? applyTracking(body, cfg, token) : body }, cfg);
      if (r.status === "sent") {
        sent++;
        await updateMessage(msg.id, { status: "sent", send_mode: cfg.sendMode, sent_at: new Date().toISOString(), provider_message_id: r.messageId });
      }
    }
  }

  console.log(`\n${cfg.dryRun ? "(DRY_RUN) " : ""}follow-ups drafted=${made} sent=${sent}`);
  await recordEvent({ stage: "followup", status: "success", processed: leads.length, succeeded: made }).catch(() => {});
}

main().catch(async (e) => {
  console.error("\n✗ followup failed:", e.message);
  await recordEvent({ stage: "followup", status: "failed", message: e.message }).catch(() => {});
  process.exit(1);
});
