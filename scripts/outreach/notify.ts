/**
 * Stage 6 — NOTIFY: end-of-day digest emailed to YOURSELF (transactional self-mail, free,
 * zero ban risk) with the day's stats + a button to the review page. Skips if nothing new.
 * Run: pnpm outreach:notify
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import nodemailer from "nodemailer";

import { loadConfig } from "./lib/config";
import { hasSupabaseConfig, getMessages, getLeadsByIds, getBounceStats, getRecentEvents } from "./lib/supabase";

function latest(events: any[], stage: string) {
  return events.find((e) => e.stage === stage);
}

/**
 * Send the digest. Prefers Resend (HTTP API — works from cloud/CI, no IP blocks); falls
 * back to Gmail SMTP for local dev. (Gmail SMTP is rejected from GitHub Actions IPs.)
 */
async function sendDigest(to: string, fromName: string, fromEmail: string, subject: string, text: string, html: string): Promise<string> {
  if (process.env.RESEND_API_KEY) {
    const from = process.env.RESEND_FROM_EMAIL || `${fromName} <onboarding@resend.dev>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text, html }),
      signal: AbortSignal.timeout(30_000),
    });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(j).slice(0, 200)}`);
    return `resend:${j.id || "ok"}`;
  }
  // local fallback: Gmail SMTP
  const transporter = nodemailer.createTransport({ host: "smtp.gmail.com", port: 587, secure: false, auth: { user: fromEmail, pass: process.env.GMAIL_APP_PASSWORD } });
  const info = await transporter.sendMail({ from: `"${fromName}" <${fromEmail}>`, to, subject, text, html });
  return `gmail:${info.messageId}`;
}

async function main() {
  const cfg = loadConfig();
  if (!hasSupabaseConfig()) { console.log("⚠️ Supabase not configured — notify skipped."); return; }
  if (!process.env.RESEND_API_KEY && !process.env.GMAIL_APP_PASSWORD) { console.log("⚠️ No RESEND_API_KEY or GMAIL_APP_PASSWORD — notify skipped."); return; }

  // Review queue = draft MESSAGES (initial + follow-ups). Counting drafted LEADS would
  // miss follow-up drafts, whose lead is already in 'sent' status.
  const [queue, events] = await Promise.all([
    getMessages({ status: "draft", limit: 200 }),
    getRecentEvents(30),
  ]);

  // Failure detection: any stage that recorded a failure in the last ~26h (one cron cycle).
  // A broken pipeline must NEVER be silent — we alert even when there are 0 drafts.
  const dayAgo = Date.now() - 26 * 3600 * 1000;
  const failures = [...new Map(
    events
      .filter((e) => e.status === "failed" && new Date(e.created_at).getTime() > dayAgo)
      .map((e) => [e.stage, e]),
  ).values()];

  if (!queue.length && !failures.length) { console.log("Nothing to review and no failures — skipping digest."); return; }

  const bounce = await getBounceStats().catch(() => ({ sent: 0, bounced: 0, rate: 0 }));
  const src = latest(events, "source"); const enr = latest(events, "enrich"); const drf = latest(events, "draft");

  const followupCount = queue.filter((m) => m.kind === "followup").length;
  const followupNote = followupCount ? ` (${followupCount} follow-up${followupCount === 1 ? "" : "s"})` : "";
  const leadIds = [...new Set(queue.map((m) => m.lead_id).filter(Boolean))];
  const queueLeads = await getLeadsByIds(leadIds).catch(() => []);
  const top = queueLeads
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5).map((l) => l.company_name).join(", ");
  const reviewUrl = `${cfg.siteUrl.replace(/\/$/, "")}/admin/outreach`;
  const bouncePct = (bounce.rate * 100).toFixed(1);
  const bounceWarn = bounce.sent >= 20 && bounce.rate > 0.1;

  // what the source gates filtered tonight (senior_title / requires / stale_post / …) —
  // visibility for tuning without opening Supabase
  const auditByReason = (latest(events, "source")?.metadata as any)?.auditByReason || {};
  const auditNote = Object.keys(auditByReason).length
    ? `Filtered: ${Object.entries(auditByReason).map(([k, v]) => `${k} ${v}`).join(" · ")}`
    : "";

  const failureLines = failures.map((f) => `${f.stage}: ${f.message || "failed"}`);
  const subject = failures.length
    ? `⚠️ Outreach: ${failures.length} stage${failures.length === 1 ? "" : "s"} failed${queue.length ? ` · ${queue.length} drafts ready` : ""}`
    : `📬 ${queue.length} outreach draft${queue.length === 1 ? "" : "s"} ready to review${followupNote}`;
  const text =
    (failures.length ? `⚠️ PIPELINE ISSUES (last 26h):\n${failureLines.map((l) => `  - ${l}`).join("\n")}\n\n` : "") +
    `${queue.length} drafts${followupNote} are waiting for your review.\n` +
    `Top: ${top || "—"}\n\n` +
    `Today — sourced ${src?.succeeded ?? "?"}, enriched ${enr?.succeeded ?? "?"}, drafted ${drf?.succeeded ?? "?"}` +
    `${drf?.failed ? `, failures ${drf.failed}` : ""}.\n` +
    `Deliverability — ${bounce.bounced}/${bounce.sent} bounced (${bouncePct}%).` +
    `${bounceWarn ? " ⚠️ Bounce rate high — review before sending more." : ""}\n` +
    `${auditNote ? `${auditNote}\n` : ""}\n` +
    `Review & send: ${reviewUrl}\n`;

  const failureHtml = failures.length
    ? `<div style="background:#fde8e8;color:#a30000;padding:12px;border-radius:8px;margin-bottom:16px">
         <b>⚠️ Pipeline issues (last 26h):</b>
         <ul style="margin:6px 0 0;padding-left:18px">${failureLines.map((l) => `<li>${l}</li>`).join("")}</ul>
       </div>`
    : "";

  const html = `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;color:#0b1020">
    <h2 style="margin:0 0 6px">${failures.length ? "⚠️ Outreach pipeline issues" : `📬 ${queue.length} draft${queue.length === 1 ? "" : "s"} ready to review`}</h2>
    ${failureHtml}
    <p style="color:#555;margin:0 0 16px">${queue.length ? `${queue.length} drafts ready · Top: ${top}` : "No new drafts today."}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
      <tr><td style="padding:6px;border:1px solid #eee">Sourced</td><td style="padding:6px;border:1px solid #eee"><b>${src?.succeeded ?? "?"}</b></td>
          <td style="padding:6px;border:1px solid #eee">Enriched</td><td style="padding:6px;border:1px solid #eee"><b>${enr?.succeeded ?? "?"}</b></td></tr>
      <tr><td style="padding:6px;border:1px solid #eee">Drafted</td><td style="padding:6px;border:1px solid #eee"><b>${drf?.succeeded ?? "?"}</b></td>
          <td style="padding:6px;border:1px solid #eee">Bounced</td><td style="padding:6px;border:1px solid #eee"><b>${bounce.bounced}/${bounce.sent} (${bouncePct}%)</b></td></tr>
    </table>
    ${bounceWarn ? `<p style="background:#fde8e8;color:#a30000;padding:10px;border-radius:8px">⚠️ Bounce rate is high — review your list before sending more.</p>` : ""}
    ${auditNote ? `<p style="color:#888;font-size:12px;margin:0 0 16px">${auditNote}</p>` : ""}
    <a href="${reviewUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">Review &amp; send →</a>
    <p style="color:#888;font-size:12px;margin-top:20px">Draft mode — nothing is sent automatically. You review and click “Open in Gmail”.</p>
  </div>`;

  const id = await sendDigest(cfg.fromEmail, "Outreach Engine", cfg.fromEmail, subject, text, html);
  console.log(`✓ Digest sent to ${cfg.fromEmail} (${queue.length} drafts) via ${id}`);
}

main().catch((e) => { console.error("\n✗ notify failed:", e.message); process.exit(1); });
