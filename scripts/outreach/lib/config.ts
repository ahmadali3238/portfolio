/**
 * Central config for the outreach worker.
 * Layering (lowest → highest precedence): built-in defaults  <  outreach.config.json
 * (committed, non-secret)  <  environment variables (OUTREACH_* — for CI/secrets).
 * Secrets (GROQ/GEMINI/GMAIL_APP_PASSWORD/SUPABASE) live only in env, never in the JSON.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function readBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}
export function readNum(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
export function readList(value: string | undefined, fallback: string[] = []): string[] {
  if (!value) return fallback;
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Load the committed non-secret config file (returns {} if missing/invalid). */
function loadFileConfig(): Record<string, any> {
  try { return JSON.parse(readFileSync(join(__dirname, "..", "outreach.config.json"), "utf8")); }
  catch { return {}; }
}

export interface OutreachConfig {
  dryRun: boolean; timezone: string;
  sources: string[]; segments: string[]; keywords: string[];
  minScore: number; maxNewLeadsPerRun: number; targetCountries: string[]; excludeCountries: string[];
  maxLocalLeadsPerRun: number; localMinScore: number;
  maxProspectLeadsPerRun: number; prospectMinScore: number;
  yearsExperience: number; skipUnnumberedSenior: boolean; aiQualify: boolean; maxPostAgeDays: number;
  enrichProviders: string[]; manualCsvDir: string;
  llmProvider: string; llmPremiumProvider: string; llmModel: string;
  sendMode: "draft" | "gmail" | "smtp" | "export";
  autoApprove: boolean; dailySendLimit: number; sendLocalHours: [number, number];
  followupDays: number[]; autoFollowup: boolean; fromName: string; fromEmail: string;
  rateNote: string;
  portfolioUrl: string; postalAddress: string; bookingUrl: string; resumePath: string;
  resumeUrl: string; attachWhenDemanded: boolean; socialLinks: Record<string, string>; siteUrl: string;
  imapPoll: boolean; openPixel: boolean; trackLinks: boolean;
}

function parseHours(v: string | undefined, fallback: [number, number]): [number, number] {
  if (!v) return fallback;
  const m = v.match(/(\d{1,2})\s*-\s*(\d{1,2})/);
  return m ? [Number(m[1]), Number(m[2])] : fallback;
}

export function loadConfig(): OutreachConfig {
  const env = process.env;
  const f = loadFileConfig();
  return {
    dryRun: readBool(env.OUTREACH_DRY_RUN, f.dryRun ?? true),
    timezone: env.OUTREACH_TIMEZONE || f.timezone || "Asia/Dubai",

    sources: readList(env.OUTREACH_SOURCES, f.sources ?? ["jsearch", "careerjet", "jooble"]),
    segments: readList(env.OUTREACH_SEGMENTS, f.segments ?? ["hiring_signal"]),
    keywords: readList(env.OUTREACH_KEYWORDS, f.keywords ?? ["asset planning", "fixed asset", "asset management", "asset tracking", "inventory", "inventory control", "stock control", "warehouse", "storekeeper", "rfid", "barcode", "asset tagging", "cycle count", "reconciliation", "supply chain"]),
    minScore: readNum(env.OUTREACH_MIN_SCORE, f.minScore ?? 55),
    maxNewLeadsPerRun: readNum(env.OUTREACH_MAX_NEW_LEADS_PER_RUN, f.maxNewLeadsPerRun ?? 25),
    // local "no website" lane gets its OWN small cap so it never crowds out job leads (or vice
    // versa) — they're scored on different scales and compete for the same daily manual sends.
    maxLocalLeadsPerRun: readNum(env.OUTREACH_MAX_LOCAL_LEADS_PER_RUN, f.maxLocalLeadsPerRun ?? 8),
    localMinScore: readNum(env.OUTREACH_LOCAL_MIN_SCORE, f.localMinScore ?? 55),
    // prospect lane (not-hiring companies, value-first cold email) — kept deliberately SMALL and
    // at a lower score bar; the enrich stage only drafts ones with a real published email.
    maxProspectLeadsPerRun: readNum(env.OUTREACH_MAX_PROSPECT_LEADS_PER_RUN, f.maxProspectLeadsPerRun ?? 5),
    prospectMinScore: readNum(env.OUTREACH_PROSPECT_MIN_SCORE, f.prospectMinScore ?? 40),
    targetCountries: readList(env.OUTREACH_TARGET_COUNTRIES, f.targetCountries ?? []),
    excludeCountries: readList(env.OUTREACH_EXCLUDE_COUNTRIES, f.excludeCountries ?? []).map((c) => c.toLowerCase()),

    yearsExperience: readNum(env.OUTREACH_YEARS_EXPERIENCE, f.yearsExperience ?? 7),
    skipUnnumberedSenior: readBool(env.OUTREACH_SKIP_UNNUMBERED_SENIOR, f.skipUnnumberedSenior ?? true),
    aiQualify: readBool(env.OUTREACH_AI_QUALIFY, f.aiQualify ?? true),
    // job posts older than this are likely filled — reject as stale (0 disables the gate)
    maxPostAgeDays: readNum(env.OUTREACH_MAX_POST_AGE_DAYS, f.maxPostAgeDays ?? 30),

    enrichProviders: readList(env.OUTREACH_ENRICH_PROVIDERS, f.enrichProviders ?? ["inpost", "freefinder"]),
    manualCsvDir: env.OUTREACH_MANUAL_CSV_DIR || f.manualCsvDir || "./scripts/outreach/inbox",

    llmProvider: (env.OUTREACH_LLM_PROVIDER || f.llmProvider || "groq").toLowerCase(),
    llmPremiumProvider: (env.OUTREACH_LLM_PREMIUM_PROVIDER || f.llmPremiumProvider || "gemini").toLowerCase(),
    llmModel: env.OUTREACH_LLM_MODEL || f.llmModel || "",

    sendMode: (env.OUTREACH_SEND_MODE || f.sendMode || "draft") as OutreachConfig["sendMode"],
    autoApprove: readBool(env.OUTREACH_AUTO_APPROVE, f.autoApprove ?? false),
    dailySendLimit: readNum(env.OUTREACH_DAILY_SEND_LIMIT, f.dailySendLimit ?? 30),
    sendLocalHours: parseHours(env.OUTREACH_SEND_LOCAL_HOURS, (f.sendLocalHours as [number, number]) ?? [9, 17]),
    followupDays: readList(env.OUTREACH_FOLLOWUP_DAYS, (f.followupDays ?? [3, 7, 14]).map(String)).map(Number),
    autoFollowup: readBool(env.OUTREACH_AUTO_FOLLOWUP, f.autoFollowup ?? false),
    fromName: env.OUTREACH_FROM_NAME || f.fromName || "Ahmad Ali",
    fromEmail: env.OUTREACH_FROM_EMAIL || f.fromEmail || "ahmadalibusiness3238@gmail.com",

    rateNote: env.OUTREACH_RATE_NOTE || f.rateNote || "",
    portfolioUrl: env.OUTREACH_PORTFOLIO_URL || f.portfolioUrl || "https://ahmadali3238.vercel.app",
    postalAddress: env.OUTREACH_POSTAL_ADDRESS ?? f.postalAddress ?? "",
    bookingUrl: env.OUTREACH_BOOKING_URL || f.bookingUrl || "",
    resumePath: env.OUTREACH_RESUME_PATH || f.resumePath || "./scripts/outreach/assets/resume.pdf",
    resumeUrl: env.OUTREACH_RESUME_URL || f.resumeUrl || "",
    attachWhenDemanded: readBool(env.OUTREACH_ATTACH_WHEN_DEMANDED, f.attachWhenDemanded ?? true),
    socialLinks: f.socialLinks ?? {
      linkedin: "https://www.linkedin.com/in/ahmadali3238",
    },
    siteUrl: env.NEXT_PUBLIC_SITE_URL || f.siteUrl || f.portfolioUrl || "https://ahmadali3238.vercel.app",

    imapPoll: readBool(env.OUTREACH_IMAP_POLL, f.imapPoll ?? true),
    openPixel: readBool(env.OUTREACH_OPEN_PIXEL, f.openPixel ?? false),
    // visible /r/<token>?to=… redirects in plain-text email look spammy — off unless opted in
    trackLinks: readBool(env.OUTREACH_TRACK_LINKS, f.trackLinks ?? false),
  };
}
