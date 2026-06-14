/**
 * Stage 3 — DRAFT: personalize each `enriched` lead into a unique email (free LLM),
 * with an anti-duplication guard, and store it as a `draft` message + tracking token.
 *
 * Run: pnpm outreach:draft   (needs Supabase + GROQ_API_KEY; honors OUTREACH_DRY_RUN)
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { randomUUID } from "node:crypto";

import { loadConfig } from "./lib/config";
import { personalize } from "./lib/personalize";
import { personalizeLocal } from "./lib/personalize-local";
import { runGauntlet, GAUNTLET_PROMPT_VERSION } from "./lib/qualify-ai";
import { similarity } from "./lib/dedupe";
import { hasSupabaseConfig, getLeads, updateLead, insertMessage, isEmailSuppressed, recordEvent } from "./lib/supabase";

async function main() {
  const cfg = loadConfig();
  if (!hasSupabaseConfig()) { console.log("⚠️ Supabase not configured — draft needs the DB."); return; }

  const leads = await getLeads({ status: "enriched", limit: 30, order: "score.desc" });
  console.log(`→ Drafting ${leads.length} enriched leads  (dryRun=${cfg.dryRun})\n`);

  const recentBodies: string[] = [];
  let ok = 0, failed = 0, suppressed = 0, gauntletRejected = 0;
  for (const l of leads) {
    try {
      // suppression: never draft/contact anyone who opted out or was skipped
      if (l.email && (await isEmailSuppressed(l.email))) {
        suppressed++;
        if (!cfg.dryRun) await updateLead(l.id, { status: "skipped", status_reason: "suppressed" });
        console.log(`  ⊘ ${l.company_name}: suppressed (opted out earlier)`);
        continue;
      }

      // AI quality gauntlet: only genuinely promising leads get a daily send slot.
      // Rejections keep the reason (audit trail); LLM errors fail open.
      const description = (l.signal_raw as any)?.description || null;
      const requiredYears = (l.signal_raw as any)?.requiredYears ?? null;
      if (cfg.aiQualify) {
        const verdict = await runGauntlet({ company: l.company_name, signal: l.signal || "", segment: l.segment, country: l.country, description, requiredYears, myYears: cfg.yearsExperience });
        if (!verdict.qualified) {
          gauntletRejected++;
          console.log(`  ✗ ${l.company_name}: gauntlet rejected — ${verdict.reason}`);
          if (!cfg.dryRun) await updateLead(l.id, { status: "rejected", status_reason: `ai_gauntlet[${GAUNTLET_PROMPT_VERSION}]:${verdict.reason}` });
          continue;
        }
      }
      const isLocal = l.segment === "local_no_website";
      const sr = (l.signal_raw as any) || {};
      let email = isLocal
        ? await personalizeLocal({ company: l.company_name, category: sr.categoryLabel || sr.category, city: sr.city, country: l.country, signal: l.signal, description }, cfg)
        : await personalize({ company: l.company_name, signal: l.signal || "", segment: l.segment, country: l.country, description }, cfg);
      // anti-duplication: regenerate once if too similar to a body already drafted this run
      if (recentBodies.some((b) => similarity(b, email.body) > 0.7)) {
        email = isLocal
          ? await personalizeLocal({ company: l.company_name, category: sr.categoryLabel || sr.category, city: sr.city, country: l.country, signal: `${l.signal} (use a fresh angle)`, description }, cfg)
          : await personalize({ company: l.company_name, signal: `${l.signal} (use a fresh angle)`, segment: l.segment, country: l.country, description }, cfg);
      }
      recentBodies.push(email.body);
      ok++;
      console.log(`  ✓ ${l.company_name}: "${email.subject}"`);

      if (!cfg.dryRun) {
        const token = randomUUID().replace(/-/g, "").slice(0, 20);
        await insertMessage({
          lead_id: l.id, kind: "initial", sequence: 0,
          subject: email.subject, body: email.body, status: "draft",
          channel: isLocal ? "whatsapp" : "email",
          tracking_token: token, ai_meta: { ...email.aiMeta, altSubject: email.altSubject, attachments: email.attachments },
        });
        await updateLead(l.id, { status: "drafted" });
      }
    } catch (e) {
      failed++;
      console.error(`  ✗ ${l.company_name}: ${(e as Error).message}`);
    }
    // pace the loop: gauntlet + draft ≈ 1.5k tokens/lead; Groq free tier caps at 12k
    // tokens/min, so back-to-back leads trip 429s without this.
    await new Promise((r) => setTimeout(r, 5_000));
  }

  console.log(`\n${cfg.dryRun ? "(DRY_RUN) " : ""}Drafted ${ok}, failed ${failed}, suppressed ${suppressed}, gauntlet-rejected ${gauntletRejected}.`);
  if (!cfg.dryRun) await recordEvent({ stage: "draft", status: "success", processed: leads.length, succeeded: ok, failed, metadata: { gauntletRejected, suppressed } });
}

main().catch(async (e) => {
  console.error("\n✗ draft failed:", e.message);
  await recordEvent({ stage: "draft", status: "failed", message: e.message }).catch(() => {});
  process.exit(1);
});
