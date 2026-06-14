/** Himalayas — free search API, verified live (2026-06: {jobs:[…]}, 20 items/request cap,
 *  ~50 new jobs/hour platform-wide, data cache refreshes daily → nightly polling is the
 *  intended cadence). Unlike HN/RemoteOK/WWR it exposes STRUCTURED seniority[],
 *  employmentType and locationRestrictions[], so senior-only roles are tagged at the
 *  source. No email/domain fields — enrichment resolves from the company name.
 *  Attribution is only required when displaying listings publicly (we don't). */
import type { RawLead } from "../types";
import { getJson, decodeHtml, firstEmail, detectStack } from "./http";

const API = "https://himalayas.app/jobs/api/search";
// one focused query per service keyword family; 20-item cap per call
const QUERIES = ["react", "next.js", "node.js", "typescript", "ai agent"];

interface HimalayasJob {
  title?: string; companyName?: string; companySlug?: string;
  employmentType?: string; seniority?: string[]; locationRestrictions?: string[];
  minSalary?: number | null; maxSalary?: number | null; currency?: string;
  description?: string; excerpt?: string; pubDate?: number; applicationLink?: string; guid?: string;
}

export async function fetchHimalayas(): Promise<RawLead[]> {
  const seen = new Set<string>();
  const out: RawLead[] = [];
  for (const q of QUERIES) {
    let jobs: HimalayasJob[] = [];
    try {
      const res = await getJson<{ jobs?: HimalayasJob[] }>(
        `${API}?q=${encodeURIComponent(q)}&sort=recent&limit=20`);
      jobs = res.jobs || [];
    } catch (e) {
      console.error(`  himalayas query "${q}" failed (skipped):`, (e as Error).message);
      continue;
    }
    for (const j of jobs) {
      const key = j.guid || j.applicationLink || `${j.companyName}|${j.title}`;
      if (!j.title || !j.companyName || seen.has(key)) continue;
      seen.add(key);
      const locations = (j.locationRestrictions || []).join(", ");
      const seniority = (j.seniority || []).join("/");
      // seniority + employmentType folded into the signal line so the title-line
      // senior gate and the drafting LLM both see them
      const signal = `${j.title}${seniority ? ` — ${seniority}` : ""}${j.employmentType ? ` — ${j.employmentType}` : ""} — ${locations || "remote"}`;
      const description = j.description ? decodeHtml(j.description).slice(0, 2500) : (j.excerpt || null);
      const postedAt = typeof j.pubDate === "number" && j.pubDate > 0
        ? new Date(j.pubDate * (j.pubDate < 1e12 ? 1000 : 1)).toISOString() : null;
      out.push({
        company: String(j.companyName).slice(0, 80),
        segment: "hiring_signal",
        source: "himalayas",
        sourceUrl: j.applicationLink || j.guid || (j.companySlug ? `https://himalayas.app/companies/${j.companySlug}` : null),
        signal: signal.slice(0, 240),
        signalRaw: {
          seniority: j.seniority, employmentType: j.employmentType, query: q,
          salary: j.minSalary ? `${j.minSalary}-${j.maxSalary || ""} ${j.currency || ""}` : null,
          attribution: "Source: Himalayas — https://himalayas.app",
        },
        postedAt,
        description,
        email: description ? firstEmail(description) : null,
        stack: detectStack(`${j.title} ${description || ""}`),
        country: (j.locationRestrictions || [])[0] || null,
      });
    }
  }
  return out;
}
