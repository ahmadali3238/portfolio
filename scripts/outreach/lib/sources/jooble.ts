/** Jooble REST API — free key, strong UAE volume (ae.jooble.org, 33k+ vacancies).
 *  FAIL-SOFT: a missing API key, a bad response, or any throw returns []. Report 07 §2:
 *  POST https://jooble.org/api/{key}  with JSON body {keywords, location, page}.
 *  Env: JOOBLE_API_KEY. */
import type { RawLead } from "../types";
import { decodeHtml, UA } from "./http";

// One combined keyword string + a couple of focused ones — kept small (free key, polite cadence).
const QUERIES = [
  "asset inventory warehouse",
  "fixed asset specialist",
  "stock controller storekeeper",
];

interface JoobleJob {
  title?: string;
  company?: string;
  location?: string;
  snippet?: string;
  link?: string;
  updated?: string;
  salary?: string;
  type?: string;
}

export async function fetchJooble(): Promise<RawLead[]> {
  const key = process.env.JOOBLE_API_KEY;
  if (!key) return []; // no key → silently skip (fail-soft)

  const out: RawLead[] = [];
  const seen = new Set<string>();
  for (const kw of QUERIES) {
    try {
      const res = await fetch(`https://jooble.org/api/${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": UA, Accept: "application/json" },
        body: JSON.stringify({ keywords: kw, location: "Dubai", page: "1" }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) { console.error(`  jooble "${kw}" failed (skipped): HTTP ${res.status}`); continue; }
      const json = (await res.json()) as { jobs?: JoobleJob[]; totalCount?: number };
      for (const j of json.jobs || []) {
        const dedupe = j.link || `${j.company}|${j.title}`;
        if (!j.title || seen.has(dedupe)) continue;
        seen.add(dedupe);
        const company = String(j.company || "(unknown)").slice(0, 80);
        const loc = j.location || "United Arab Emirates";
        const signal = `${j.title}${j.type ? ` — ${j.type}` : ""} — ${loc}`;
        out.push({
          company,
          segment: "hiring_signal",
          source: "jooble",
          sourceUrl: j.link || null,
          signal: signal.slice(0, 240),
          signalRaw: { keywords: kw, location: j.location, salary: j.salary || null, type: j.type || null, attribution: "Source: Jooble — https://ae.jooble.org" },
          postedAt: j.updated && !Number.isNaN(Date.parse(j.updated)) ? new Date(j.updated).toISOString() : null,
          description: j.snippet ? decodeHtml(String(j.snippet)).slice(0, 2500) : null,
          country: loc,
          stack: [],
        });
      }
    } catch (e) {
      console.error(`  jooble "${kw}" failed (skipped):`, (e as Error).message);
    }
  }
  return out;
}
