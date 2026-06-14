/**
 * Stage 4 — SEND: deliver drafted emails per OUTREACH_SEND_MODE.
 *   draft  → build a Gmail compose link per lead (you click Send) — default, zero risk
 *   gmail  → auto-send via Gmail SMTP (app password); respects daily cap + send window
 *   smtp   → auto-send via a dedicated domain
 *   export → write a CSV for manual outreach
 * Run: pnpm outreach:send   (honors OUTREACH_DRY_RUN)
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { writeFileSync, mkdirSync } from "node:fs";

import { loadConfig } from "./lib/config";
import { send, composeUrl, toCsvRow } from "./lib/sender";
import { applyTracking } from "./lib/tracking";
import { hasSupabaseConfig, getLeads, getMessages, updateLead, updateMessage, countSentToday, isEmailSuppressed, getBounceStats, recordEvent } from "./lib/supabase";

const BOUNCE_PAUSE_RATE = Number(process.env.OUTREACH_BOUNCE_PAUSE_RATE || "0.1");

function inSendWindow(cfg: ReturnType<typeof loadConfig>): boolean {
  if (process.env.OUTREACH_IGNORE_SEND_WINDOW === "1") return true;
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: cfg.timezone }).format(now));
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: cfg.timezone }).format(now);
  const weekday = !["Sat", "Sun"].includes(day);
  return weekday && hour >= cfg.sendLocalHours[0] && hour < cfg.sendLocalHours[1];
}

async function main() {
  const cfg = loadConfig();
  if (!hasSupabaseConfig()) { console.log("⚠️ Supabase not configured — send needs the DB."); return; }
  const autoApprove = cfg.autoApprove;

  // Auto-pause: if recent bounce rate is high, halt auto-sending to protect reputation.
  if (cfg.sendMode === "gmail" || cfg.sendMode === "smtp") {
    const b = await getBounceStats().catch(() => ({ sent: 0, bounced: 0, rate: 0 }));
    if (b.sent >= 20 && b.rate > BOUNCE_PAUSE_RATE) {
      const msg = `Bounce rate ${(b.rate * 100).toFixed(1)}% (${b.bounced}/${b.sent}) > ${(BOUNCE_PAUSE_RATE * 100)}% — auto-paused sending.`;
      console.log(`⏸ ${msg}`);
      await recordEvent({ stage: "send", status: "skipped", message: msg }).catch(() => {});
      return;
    }
  }

  // gmail/smtp pull only approved (or draft if auto-approve); draft/export pull drafted leads
  const leads = await getLeads({ status: "drafted", limit: 200, order: "score.desc" });
  console.log(`→ Send mode: ${cfg.sendMode}  leads=${leads.length}  (dryRun=${cfg.dryRun})\n`);

  const csv: string[] = ["company,email,subject,body"];
  let remaining = cfg.dailySendLimit - (await countSentToday().catch(() => 0));
  let sent = 0, drafted = 0, failed = 0, skipped = 0;

  for (const l of leads) {
    const msgs = await getMessages({ leadId: l.id, status: "draft", limit: 1 });
    const msg = msgs[0];
    if (!msg) continue;
    // Non-email channels (local "no website" → WhatsApp) are dashboard-manual ONLY. The channel
    // field gates them out of every email path here (compose link, CSV export, auto-send), so a
    // WhatsApp-formatted body can never go out as an email. Enforces the lane's design invariant.
    if (msg.channel && msg.channel !== "email") continue;
    if (!l.email) { skipped++; continue; }
    if (l.status === "email_blocked") { skipped++; continue; } // route to LinkedIn lane, not email
    if (await isEmailSuppressed(l.email)) {                     // honor opt-outs instantly
      skipped++;
      if (!cfg.dryRun) await updateLead(l.id, { status: "skipped", status_reason: "suppressed" });
      continue;
    }

    // opt-in only: tracked redirects are visible in plain-text email and read as spam
    const body = cfg.trackLinks ? applyTracking(msg.body, cfg, msg.tracking_token || "") : msg.body;

    if (cfg.sendMode === "export") {
      csv.push(toCsvRow([l.company_name, l.email, msg.subject, body]));
      drafted++;
      continue;
    }
    if (cfg.sendMode === "draft") {
      const url = composeUrl(l.email, msg.subject, body);
      if (!cfg.dryRun) await updateMessage(msg.id, { compose_url: url, send_mode: "draft" });
      drafted++;
      console.log(`  ✎ ${l.company_name} <${l.email}> → compose link ready`);
      continue;
    }
    // gmail | smtp (auto-send)
    if (!autoApprove && msg.status !== "approved") { skipped++; continue; }
    if (remaining <= 0) { console.log("  ⏸ daily send cap reached."); break; }
    if (!inSendWindow(cfg)) { console.log("  ⏸ outside send window (weekday business hours)."); break; }

    if (cfg.dryRun) { console.log(`  (dry) would send to ${l.email}`); drafted++; continue; }
    const r = await send({ to: l.email, subject: msg.subject, body, attachResume: (msg.ai_meta as any)?.attachments?.resume }, cfg);
    if (r.status === "sent") {
      sent++; remaining--;
      await updateMessage(msg.id, { status: "sent", send_mode: cfg.sendMode, sent_at: new Date().toISOString(), provider_message_id: r.messageId });
      await updateLead(l.id, { status: "sent" });
      console.log(`  ✓ sent → ${l.email}`);
    } else {
      failed++;
      await updateMessage(msg.id, { status: "failed", error: r.error });
      console.log(`  ✗ failed → ${l.email}: ${r.error}`);
    }
  }

  if (cfg.sendMode === "export" && !cfg.dryRun) {
    mkdirSync("scripts/outreach/out", { recursive: true });
    const file = `scripts/outreach/out/outreach-export.csv`;
    writeFileSync(file, csv.join("\n"));
    console.log(`\n✓ Exported ${drafted} rows → ${file}`);
  }

  console.log(`\n${cfg.dryRun ? "(DRY_RUN) " : ""}sent=${sent} drafted=${drafted} failed=${failed} skipped=${skipped}`);
  await recordEvent({ stage: "send", status: failed ? "partial" : "success", processed: leads.length, succeeded: sent + drafted, failed }).catch(() => {});
}

main().catch(async (e) => {
  console.error("\n✗ send failed:", e.message);
  await recordEvent({ stage: "send", status: "failed", message: e.message }).catch(() => {});
  process.exit(1);
});
