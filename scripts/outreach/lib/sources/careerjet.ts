/** Careerjet public search API — native UAE coverage via the en_AE locale (www.careerjet.ae).
 *  Free affiliate account; returns JSON jobs. FAIL-SOFT: a missing affiliate id, a bad
 *  response, or any throw returns []. Report 07 §2:
 *  GET http://public.api.careerjet.net/search?locale_code=en_AE&keywords=...&location=Dubai&affid=...
 *  Env: CAREERJET_AFFID (affiliate id). */
import type { RawLead } from "../types";
import { decodeHtml, UA } from "./http";

const ENDPOINT = "http://public.api.careerjet.net/search";

// One focused query per asset/inventory family — kept small; the affiliate API is rate-limited.
const KEYWORDS = ["fixed asset inventory", "inventory controller", "warehouse storekeeper"];

interface CareerjetJob {
  title?: string;
  company?: string;
  locations?: string;
  description?: string;
  url?: string;
  date?: string;
  salary?: string;
}

export async function fetchCareerjet(): Promise<RawLead[]> {
  const affid = process.env.CAREERJET_AFFID;
  if (!affid) return []; // no affiliate id → silently skip (fail-soft)

  const out: RawLead[] = [];
  const seen = new Set<string>();
  for (const kw of KEYWORDS) {
    try {
      const params = new URLSearchParams({
        locale_code: "en_AE",
        keywords: kw,
        location: "Dubai",
        affid,
        sort: "date",
        pagesize: "20",
        page: "1",
        // Careerjet requires the end-user's IP + UA for affiliate accounting; CI has neither,
        // so we send safe placeholders (the API accepts them and still returns listings).
        user_ip: "127.0.0.1",
        user_agent: UA,
      });
      const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) { console.error(`  careerjet "${kw}" failed (skipped): HTTP ${res.status}`); continue; }
      const json = (await res.json()) as { jobs?: CareerjetJob[]; type?: string };
      for (const j of json.jobs || []) {
        const key = j.url || `${j.company}|${j.title}`;
        if (!j.title || seen.has(key)) continue;
        seen.add(key);
        const company = String(j.company || "(unknown)").slice(0, 80);
        const loc = j.locations || "United Arab Emirates";
        const signal = `${j.title} — ${loc}`;
        out.push({
          company,
          segment: "hiring_signal",
          source: "careerjet",
          sourceUrl: j.url || null,
          signal: signal.slice(0, 240),
          signalRaw: { keywords: kw, locations: j.locations, salary: j.salary || null, attribution: "Source: Careerjet — https://www.careerjet.ae" },
          postedAt: j.date && !Number.isNaN(Date.parse(j.date)) ? new Date(j.date).toISOString() : null,
          description: j.description ? decodeHtml(String(j.description)).slice(0, 2500) : null,
          country: loc,
          stack: [],
        });
      }
    } catch (e) {
      console.error(`  careerjet "${kw}" failed (skipped):`, (e as Error).message);
    }
  }
  return out;
}
