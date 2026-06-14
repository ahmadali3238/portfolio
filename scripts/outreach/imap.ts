/**
 * Reply ingestion (§5) — poll Gmail over IMAP (free, Node built-in tls — proven in PoC),
 * match inbound senders to leads, auto-classify replies, and detect bounces.
 * Envelope-based matching (reliable); full-body classification also happens in the dashboard.
 * Run: pnpm outreach:imap
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import * as tls from "node:tls";

import { loadConfig } from "./lib/config";
import { classifyReply } from "./lib/classify";
import { hasSupabaseConfig, getLeadByEmail, updateLead, insertReply, recordEvent } from "./lib/supabase";

interface Envelope { seq: number; from: string; fromName: string; subject: string; }

function fetchRecentEnvelopes(user: string, pass: string, count = 40): Promise<Envelope[]> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: "imap.gmail.com", port: 993, servername: "imap.gmail.com" });
    let buf = "", step = 0, total = 0;
    const envs: Envelope[] = [];
    const timer = setTimeout(() => { socket.destroy(); reject(new Error("imap timeout")); }, 30_000);
    const send = (c: string) => socket.write(c + "\r\n");

    socket.on("data", (d) => {
      buf += d.toString("utf8");
      const m = buf.match(/\* (\d+) EXISTS/); if (m) total = Number(m[1]);
      if (step === 0 && /\* OK/.test(buf)) { step = 1; buf = ""; send(`a1 LOGIN "${user}" "${pass}"`); }
      else if (step === 1 && /a1 (OK|NO|BAD)/.test(buf)) {
        if (!/a1 OK/.test(buf)) { clearTimeout(timer); socket.destroy(); return reject(new Error("IMAP login failed")); }
        step = 2; buf = ""; send("a2 SELECT INBOX");
      } else if (step === 2 && /a2 (OK|NO|BAD)/.test(buf)) {
        step = 3; buf = ""; const start = Math.max(1, total - count + 1); send(`a3 FETCH ${start}:* (ENVELOPE)`);
      } else if (step === 3 && /a3 (OK|NO|BAD)/.test(buf)) {
        // parse each "* <seq> FETCH (ENVELOPE (...))" line
        const lines = buf.split(/\r?\n/);
        for (const line of lines) {
          const fm = line.match(/\* (\d+) FETCH \(ENVELOPE \("[^"]*" "((?:[^"\\]|\\.)*)" \(\("((?:[^"\\]|\\.)*)" NIL "([^"]+)" "([^"]+)"/);
          if (fm) envs.push({ seq: Number(fm[1]), subject: fm[2], fromName: fm[3], from: `${fm[4]}@${fm[5]}`.toLowerCase() });
        }
        step = 4; buf = ""; send("a4 LOGOUT");
      } else if (step === 4 && /a4 OK|BYE/.test(buf)) { clearTimeout(timer); socket.end(); resolve(envs); }
    });
    socket.on("error", (e) => { clearTimeout(timer); reject(e); });
  });
}

const isBounce = (e: Envelope) =>
  /mailer-daemon|postmaster|mail delivery/i.test(e.from + e.fromName) ||
  /undeliverable|delivery status|failure notice|returned mail/i.test(e.subject);

async function main() {
  const cfg = loadConfig();
  const user = process.env.GMAIL_IMAP_USER || cfg.fromEmail;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!pass) { console.log("⚠️ GMAIL_APP_PASSWORD not set — IMAP poll skipped."); return; }
  if (!hasSupabaseConfig()) { console.log("⚠️ Supabase not configured — IMAP poll needs the DB."); return; }

  console.log("→ Polling Gmail inbox for replies & bounces…");
  const envs = await fetchRecentEnvelopes(user, pass);
  let replies = 0, bounces = 0;

  for (const e of envs) {
    const lead = await getLeadByEmail(e.from).catch(() => null);
    if (!lead && !isBounce(e)) continue;

    if (isBounce(e)) {
      // try to map the bounce back to a lead by scanning the subject for a known email is hard;
      // mark by from-domain match if we have the lead, else just log.
      if (lead) { await updateLead(lead.id, { status: "bounced" }); bounces++; }
      continue;
    }
    if (lead && lead.status === "sent") {
      const c = await classifyReply(e.subject, { company: lead.company_name }).catch(() => null);
      await insertReply({
        lead_id: lead.id, raw_text: `(subject) ${e.subject}`,
        classification: c?.classification || null, sentiment: c?.sentiment || null,
        confidence: c?.confidence || null, suggested_followup: c?.suggested_followup || null,
      });
      await updateLead(lead.id, { status: c?.classification === "unsubscribe" ? "skipped" : "replied" });
      replies++;
      console.log(`  ✉ reply from ${lead.company_name} (${e.from}) → ${c?.classification || "unclassified"}`);
    }
  }

  console.log(`\n✓ Scanned ${envs.length} messages → ${replies} replies, ${bounces} bounces.`);
  await recordEvent({ stage: "classify", status: "success", processed: envs.length, succeeded: replies, failed: bounces }).catch(() => {});
}

main().catch(async (e) => {
  console.error("\n✗ imap poll failed:", e.message);
  await recordEvent({ stage: "classify", status: "failed", message: e.message }).catch(() => {});
  process.exit(1);
});
