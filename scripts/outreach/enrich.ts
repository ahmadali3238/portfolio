/**
 * Stage 2 — ENRICH: for each `sourced` lead, find a verified email via the free waterfall
 * (in-post → free-finder). Sets `enriched` or `enrich_failed`. 100% free.
 *
 * Run: pnpm outreach:enrich   (needs Supabase; honors OUTREACH_DRY_RUN)
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();

import { loadConfig } from "./lib/config";
import { enrich } from "./lib/enrichment";
import { verifyNoWebsite } from "./lib/enrichment/local-verify";
import { isLowQualityEmail } from "./lib/quality";
import { hasSupabaseConfig, getLeads, updateLead, recordEvent } from "./lib/supabase";

async function main() {
  const cfg = loadConfig();
  if (!hasSupabaseConfig()) { console.log("⚠️ Supabase not configured — enrich needs the DB. Set SUPABASE_URL/KEY."); return; }

  const leads = await getLeads({ status: "sourced", limit: 100, order: "score.desc" });
  console.log(`→ Enriching ${leads.length} sourced leads via [${cfg.enrichProviders.join(" → ")}]  (dryRun=${cfg.dryRun})\n`);

  let ok = 0, failed = 0, hasSite = 0;
  for (const l of leads) {
    // ── LOCAL "no website" lane: don't hunt for an email (OSM email ~0%, and the channel is
    // phone/WhatsApp). Instead VERIFY they really have no site — if a matching live site turns
    // up, the free-website pitch would be wrong, so disqualify. Otherwise enrich on the phone. ──
    if (l.segment === "local_no_website") {
      const v = await verifyNoWebsite(l.company_name, l.country || "").catch(() => ({ hasWebsite: false, url: null, email: null, checked: 0 }));
      if (v.hasWebsite) {
        hasSite++;
        console.log(`  ⊘ ${l.company_name}: has a website (${v.url}) — disqualified from free-site pitch`);
        if (!cfg.dryRun) await updateLead(l.id, { status: "rejected", status_reason: `has_website:${v.url}`, domain: (v.url || "").replace(/^https?:\/\//, "") || null, email: v.email || l.email });
        continue;
      }
      const sr = (l.signal_raw as any) || {};
      const reachable = Boolean(sr.waPhone || v.email);
      if (reachable) ok++; else failed++;
      console.log(`  ${reachable ? "✓" : "✗"} ${l.company_name}: no site found (checked ${v.checked}) — ${sr.waPhone ? "phone" : v.email ? "email" : "no channel"}`);
      if (!cfg.dryRun) await updateLead(l.id, { status: reachable ? "enriched" : "enrich_failed", status_reason: reachable ? "local_no_site" : "local_no_channel", email: v.email || l.email, email_status: v.email ? "scraped" : l.email_status });
      continue;
    }

    const r = await enrich(
      { email: l.email, domain: l.domain, company: l.company_name, personName: l.person_name },
      cfg.enrichProviders,
    );

    // Deliverability gate: drop scraped generic role mailboxes (info@/hello@…) — high bounce.
    const lowQuality = r.email && isLowQualityEmail(r.email, r.emailStatus);
    const status = r.email && !lowQuality ? "enriched" : "enrich_failed";
    const reason = lowQuality ? "skipped_role_address" : `enrich:${r.provider}`;
    if (status === "enriched") ok++; else failed++;
    console.log(`  ${status === "enriched" ? "✓" : "✗"} ${l.company_name}: ${r.email || "no email"}${lowQuality ? " (scraped role — skipped)" : ""} (${r.emailStatus}, via ${r.provider})`);

    if (!cfg.dryRun) {
      await updateLead(l.id, { email: r.email ? r.email.toLowerCase() : r.email, email_status: r.emailStatus, status, status_reason: reason });
    }
  }

  console.log(`\n${cfg.dryRun ? "(DRY_RUN) " : ""}Enriched ${ok}, failed ${failed}${hasSite ? `, has-website ${hasSite}` : ""}.`);
  if (!cfg.dryRun) await recordEvent({ stage: "enrich", status: "success", processed: leads.length, succeeded: ok, failed, metadata: { hasSite } });
}

main().catch(async (e) => {
  console.error("\n✗ enrich failed:", e.message);
  await recordEvent({ stage: "enrich", status: "failed", message: e.message }).catch(() => {});
  process.exit(1);
});
