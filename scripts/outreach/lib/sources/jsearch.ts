/** JSearch (OpenWeb Ninja / RapidAPI) — Google-for-Jobs aggregator with native UAE coverage
 *  (country=ae aggregates LinkedIn, Indeed, Glassdoor, Bayt, etc.). Free tier = 200 req/mo,
 *  so we keep to a SMALL rotating query set per run (one asset/inventory query family) to stay
 *  inside budget. FAIL-SOFT: a missing API key, a bad response, or any throw returns [].
 *  Report 07 §2: GET https://jsearch.p.rapidapi.com/search?query=...&country=ae .
 *  Env: JSEARCH_API_KEY (also accepts RAPIDAPI_KEY). */
import type { RawLead } from "../types";
import { decodeHtml } from "./http";

const HOST = "jsearch.p.rapidapi.com";
const ENDPOINT = `https://${HOST}/search`;

// A small rotating set keeps us under the 200 req/mo free tier. One run ≈ 3 requests.
const QUERIES = [
  "inventory controller in dubai",
  "fixed asset specialist in uae",
  "warehouse supervisor in dubai",
];

interface JSearchJob {
  job_id?: string;
  job_title?: string;
  employer_name?: string;
  employer_website?: string | null;
  job_city?: string | null;
  job_state?: string | null;
  job_country?: string | null;
  job_description?: string | null;
  job_apply_link?: string | null;
  job_posted_at_datetime_utc?: string | null;
  job_employment_type?: string | null;
}

function domainOf(url?: string | null): string | null {
  try { return url ? new URL(url).hostname.replace(/^www\./, "") : null; } catch { return null; }
}

export async function fetchJSearch(): Promise<RawLead[]> {
  const key = process.env.JSEARCH_API_KEY || process.env.RAPIDAPI_KEY;
  if (!key) return []; // no key → silently skip (fail-soft)

  const out: RawLead[] = [];
  const seen = new Set<string>();
  for (const q of QUERIES) {
    try {
      const url = `${ENDPOINT}?query=${encodeURIComponent(q)}&country=ae&page=1&num_pages=1&date_posted=month`;
      const res = await fetch(url, {
        headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": HOST, Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) { console.error(`  jsearch "${q}" failed (skipped): HTTP ${res.status}`); continue; }
      const json = (await res.json()) as { data?: JSearchJob[] };
      for (const j of json.data || []) {
        const key2 = j.job_id || j.job_apply_link || `${j.employer_name}|${j.job_title}`;
        if (!j.job_title || !j.employer_name || seen.has(key2)) continue;
        seen.add(key2);
        const city = [j.job_city, j.job_state].filter(Boolean).join(", ");
        const country = j.job_country || "uae";
        const signal = `${j.job_title}${j.job_employment_type ? ` — ${j.job_employment_type}` : ""} — ${city || country}`;
        out.push({
          company: String(j.employer_name).slice(0, 80),
          segment: "hiring_signal",
          source: "jsearch",
          sourceUrl: j.job_apply_link || null,
          signal: signal.slice(0, 240),
          signalRaw: { query: q, city, employmentType: j.job_employment_type, attribution: "Source: JSearch (OpenWeb Ninja)" },
          postedAt: j.job_posted_at_datetime_utc || null,
          description: j.job_description ? decodeHtml(String(j.job_description)).slice(0, 2500) : null,
          domain: domainOf(j.employer_website || j.job_apply_link),
          country: city || country,
          stack: [],
        });
      }
    } catch (e) {
      console.error(`  jsearch "${q}" failed (skipped):`, (e as Error).message);
    }
  }
  return out;
}
