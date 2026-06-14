/**
 * Stage 1 — SOURCE: discover leads from free sources, qualify (keywords + geo + experience),
 * score, dedupe, and insert as `sourced`. Rejections are NOT silently dropped — leads that
 * matched a service keyword but failed a gate are inserted as `rejected`/`email_blocked`/
 * `over_required_experience` WITH the reason (audit trail for filter tuning).
 * Pure keyword-misses (irrelevant roles) stay silent — they're noise, not signal.
 *
 * Run: pnpm outreach:source   (set OUTREACH_DRY_RUN=0 to actually write to Supabase)
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();

import { loadConfig } from "./lib/config";
import { collectLeads } from "./lib/sources";
import { setSourceCursor } from "./lib/state";
import { inferCountry, classifyGeo } from "./lib/geo";
import { assessExperience } from "./lib/experience";
import { hasKeyword } from "./lib/text";
import { scoreLead, scoreLocalLead } from "./lib/scoring";
import { dedupeKey } from "./lib/dedupe";
import { hasSupabaseConfig, insertLeads, getExistingDedupeKeys, recordEvent } from "./lib/supabase";
import type { RawLead } from "./lib/types";

/** Local "no website" lane: an entirely different gate set. The job-post gates (keyword,
 *  experience, seniority, staleness) are MEANINGLESS here — a barber never says "react" and
 *  has no "required years". We keep only the geo gate (defensive; OSM cities are tier-1) and
 *  score on contactability/pitch-fit. Email-less is FINE — the channel is phone/WhatsApp. */
function toLocalRow(lead: RawLead, cfg: ReturnType<typeof loadConfig>) {
  const geo = classifyGeo((lead.country || "").toLowerCase(), cfg.excludeCountries, cfg.targetCountries);
  const score = scoreLocalLead(lead, geo);

  let status = "sourced";
  let statusReason: string | null = null;
  if (geo.excluded) { status = "rejected"; statusReason = `geo_excluded:${geo.country || "unknown"}`; }
  else if (score < cfg.localMinScore) { status = "rejected"; statusReason = `below_min_score:${score}<${cfg.localMinScore}`; }

  const sr = (lead.signalRaw || {}) as Record<string, unknown>;
  return {
    company_name: lead.company,
    person_name: null,
    domain: null,
    linkedin_url: null,
    segment: lead.segment,
    country: geo.country,
    geo_tier: geo.tier,
    geo_score: geo.geoScore,
    source: lead.source,
    source_url: lead.sourceUrl || null,
    signal: lead.signal || null,
    signal_raw: { ...(lead.signalRaw || {}), stack: [], postedAt: null, description: lead.description || null },
    score,
    email: lead.email ? lead.email.toLowerCase() : null,
    email_status: lead.email ? "in_post" : null,
    phone: lead.phone || null,
    status,
    status_reason: statusReason,
    // dedupe on company + CITY: same name in two cities = two leads; same business re-queried = idempotent
    dedupe_key: dedupeKey(lead.company, String(sr.city || lead.country || "")),
    _score: score,
  };
}

function toRow(lead: RawLead, cfg: ReturnType<typeof loadConfig>) {
  if (lead.segment === "local_no_website") return toLocalRow(lead, cfg);

  const signalText = `${lead.company} ${lead.signal || ""} ${(lead.country || "")} ${(lead.stack || []).join(" ")}`;
  // keywords + experience look at the WHOLE posting — requirements live in the body, not the title
  const fullText = `${signalText} ${lead.description || ""}`;

  // keyword relevance gate FIRST (word-boundary — substring matching let "ai" hit "email"/
  // "available", flooding the pipeline) — non-matching roles are irrelevant noise, dropped silently
  const matchesKeyword = cfg.keywords.some((k) => hasKeyword(fullText, k));
  if (!matchesKeyword) return null;

  // raw source country first: inferCountry only knows tier-1/2 names, so an excluded
  // country stated outright by the source ("India" in Himalayas locationRestrictions)
  // must short-circuit before the signal-text guess (often the company HQ, not the market)
  const raw = lead.country && lead.country.length < 40 ? lead.country.trim().toLowerCase() : "";
  const country = (raw ? inferCountry(raw) : null)
    || (raw && cfg.excludeCountries.includes(raw) ? raw : null)
    || inferCountry(signalText)
    || (raw || null);
  const geo = classifyGeo(country, cfg.excludeCountries, cfg.targetCountries);
  // The experience/seniority gate is a JOB-POST concept — meaningless for a `prospect` (a company
  // that isn't hiring). A YC one-liner that happens to contain "senior" or a number must not be
  // mistaken for an over-level role, so prospects bypass it (the same way local leads do).
  const exp = lead.segment === "prospect"
    ? { ok: true, requiredYears: null as number | null, seniority: null as string | null, reason: null as string | null }
    : assessExperience({
        titleLine: lead.signal || "",
        fullText,
        myYears: cfg.yearsExperience,
        skipUnnumberedSenior: cfg.skipUnnumberedSenior,
      });
  const requiredYears = exp.requiredYears;
  const ageDays = lead.postedAt && !Number.isNaN(Date.parse(lead.postedAt))
    ? Math.round((Date.now() - Date.parse(lead.postedAt)) / 86_400_000) : null;
  const score = scoreLead(lead, cfg.keywords, geo);

  // prospects (not hiring) can't earn the +10 active-need bonus or an in-post email (+15), so
  // they cap lower than hiring leads — they get their own, lower bar. The enrich stage is the
  // real safety net: a prospect only gets drafted if a real, non-generic email is found on its
  // site (generic info@/hello@ are dropped), which keeps cold-email volume low and deliverable.
  const minScore = lead.segment === "prospect" ? cfg.prospectMinScore : cfg.minScore;

  // status + audit reason (kept in DB for every non-pursued lead)
  let status = "sourced";
  let statusReason: string | null = null;
  if (geo.excluded) { status = "rejected"; statusReason = `geo_excluded:${geo.country || "unknown"}`; }
  else if (!exp.ok) { status = "over_required_experience"; statusReason = exp.reason; }
  else if (geo.blocked) { status = "email_blocked"; statusReason = `opt_in_only_country:${geo.country}`; }
  else if (cfg.maxPostAgeDays > 0 && ageDays !== null && ageDays > cfg.maxPostAgeDays) { status = "rejected"; statusReason = `stale_post:${ageDays}d`; }
  else if (score < minScore) { status = "rejected"; statusReason = `below_min_score:${score}<${minScore}`; }

  return {
    company_name: lead.company,
    person_name: lead.personName || null,
    domain: lead.domain || null,
    linkedin_url: lead.linkedinUrl || null,
    segment: lead.segment,
    country: geo.country,
    geo_tier: geo.tier,
    geo_score: geo.geoScore,
    source: lead.source,
    source_url: lead.sourceUrl || null,
    signal: lead.signal || null,
    signal_raw: {
      ...(lead.signalRaw || {}),
      requiredYears,
      seniority: exp.seniority,
      stack: lead.stack,
      postedAt: lead.postedAt || null,
      description: lead.description || null,
    },
    score,
    email: lead.email ? lead.email.toLowerCase() : null, // lowercased: IMAP reply matching + suppression are eq-lookups
    email_status: lead.email ? "in_post" : null,
    status,
    status_reason: statusReason,
    dedupe_key: dedupeKey(lead.company, lead.personName),
    _score: score, // local only
  };
}

async function main() {
  const cfg = loadConfig();
  console.log(`→ Sourcing from: ${cfg.sources.join(", ")}  (dryRun=${cfg.dryRun})\n`);

  const { leads, perSource, cursors } = await collectLeads(cfg.sources);
  console.log("Per-source counts:", perSource);
  if (Object.keys(cursors).length) console.log("Cursors:", JSON.stringify(cursors), "\n");

  // qualify + score (keyword-misses already dropped)
  const rows = leads.map((l) => toRow(l, cfg)).filter(Boolean) as any[];

  // dedupe within batch
  const seen = new Set<string>();
  const deduped = rows.filter((r) => {
    if (seen.has(r.dedupe_key)) return false;
    seen.add(r.dedupe_key);
    return true;
  });

  // Drop leads already in the DB BEFORE picking the top N — otherwise the nightly top-25
  // is the same known high-scorers every run, dedupe discards them, and 0 new leads land.
  let known = new Set<string>();
  if (hasSupabaseConfig()) {
    known = await getExistingDedupeKeys(deduped.map((r) => r.dedupe_key)).catch(() => new Set<string>());
  }
  const fresh = deduped.filter((r) => !known.has(r.dedupe_key));

  const pursue = fresh.filter((r) => r.status === "sourced");
  pursue.sort((a, b) => b._score - a._score);
  // Cap each LANE separately: hiring (stack score), prospect (lower-scoring, kept deliberately
  // small to protect sender reputation), and local (contactability score) are on different
  // scales — one global top-N would let whichever scores higher tonight starve the others.
  const take = (seg: string, n: number) => pursue.filter((r) => r.segment === seg).slice(0, n);
  const batch = [
    ...take("hiring_signal", cfg.maxNewLeadsPerRun),
    ...take("prospect", cfg.maxProspectLeadsPerRun),
    ...take("local_no_website", cfg.maxLocalLeadsPerRun),
  ];
  // audit rows: matched our keywords but failed a gate — inserted WITH the reason.
  // (Leads outside tonight's top-N stay un-inserted so they remain future candidates.)
  const audit = fresh.filter((r) => r.status !== "sourced");

  console.log(`Already known (skipped): ${known.size ? deduped.length - fresh.length : "n/a (no DB)"}`);
  const toInsert = [...batch, ...audit].map(({ _score, ...rest }) => rest);

  const auditByReason: Record<string, number> = {};
  for (const a of audit) auditByReason[a.status_reason?.split(":")[0] || a.status] = (auditByReason[a.status_reason?.split(":")[0] || a.status] || 0) + 1;
  console.log(`Relevant ${deduped.length} → pursuable ${pursue.length} → inserting top ${batch.length} + ${audit.length} audit rows`);
  console.log("Audit reasons:", auditByReason, "\n");

  console.log("Top leads this run:");
  batch.slice(0, 10).forEach((r, i) =>
    console.log(`  ${i + 1}. [${r._score}] ${r.company_name} (${r.source}, ${r.country || "?"}) ${r.email || ""} — ${(r.signal || "").slice(0, 70)}`));

  if (cfg.dryRun) {
    console.log("\n(DRY_RUN) Nothing written. Set OUTREACH_DRY_RUN=0 to persist.");
    return;
  }
  if (!hasSupabaseConfig()) { console.log("\n⚠️ Supabase not configured — skipping write."); return; }

  const inserted = await insertLeads(toInsert);
  const insertedSourced = inserted.filter((r: any) => r.status === "sourced").length;
  console.log(`\n✓ Inserted ${inserted.length} rows (${insertedSourced} pursuable, ${inserted.length - insertedSourced} audit; duplicates skipped).`);

  // persist cursors only on real runs, so dry runs never skip leads
  for (const [source, cursor] of Object.entries(cursors)) await setSourceCursor(source, cursor);

  await recordEvent({ stage: "source", status: "success", processed: leads.length, succeeded: insertedSourced, metadata: { perSource, auditByReason, cursors } });
}

main().catch(async (e) => {
  console.error("\n✗ source failed:", e.message);
  await recordEvent({ stage: "source", status: "failed", message: e.message }).catch(() => {});
  process.exit(1);
});
