/** YC directory — proven live via the free yc-oss static API.
 *  These aren't necessarily hiring → segment `prospect`. Freshness matters: deep rotation
 *  through ALL batches would surface decade-old / dead / giant companies. So the pool is
 *  restricted to ACTIVE companies from RECENT batches (last ~3 years), properly sorted by
 *  batch year (string sort on "Winter/Summer ..." is alphabetical, not chronological).
 *  Cursor { offset } rotates only within that fresh pool. */
import type { RawLead } from "../types";
import type { SourceResult } from "./index";
import { getJson, detectStack } from "./http";

const RELEVANT = /\b(ai|ml|llm|agent|saas|platform|dashboard|automation|developer|web|app|api|data)\b/i;
const PAGE = 150;
const MAX_BATCH_AGE_YEARS = 3;

function batchYear(batch: unknown): number {
  const m = String(batch || "").match(/(\d{4})/);
  return m ? Number(m[1]) : 0;
}

export async function fetchYC(cursor: Record<string, any> | null): Promise<SourceResult> {
  const all = await getJson<any[]>("https://yc-oss.github.io/api/companies/all.json");
  const minYear = new Date().getFullYear() - MAX_BATCH_AGE_YEARS;
  const pool = all
    .filter((c) =>
      c?.name &&
      c.status === "Active" &&                       // skip dead / acquired / public giants
      batchYear(c.batch) >= minYear &&               // recent batches only — fresh, small, funded
      RELEVANT.test(`${c.one_liner || ""} ${(c.tags || []).join(" ")}`))
    .sort((a, b) => batchYear(b.batch) - batchYear(a.batch)); // genuinely newest first

  const offset = Number(cursor?.offset || 0) % Math.max(pool.length, 1);
  const recent = pool.slice(offset, offset + PAGE);
  const nextOffset = offset + recent.length >= pool.length ? 0 : offset + recent.length;

  const leads = recent.map((c): RawLead => {
    let domain: string | null = null;
    try { if (c.website) domain = new URL(c.website).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
    const signal = `${c.one_liner || ""} (${(c.tags || []).join(", ")})`;
    return {
      company: String(c.name).slice(0, 80),
      segment: "prospect",
      source: "yc",
      sourceUrl: c.url || c.website || null,
      signal: signal.slice(0, 240),
      signalRaw: { batch: c.batch, tags: c.tags, status: c.status },
      // YC entries aren't job posts — no posted date; long_description gives panel context
      postedAt: null,
      description: c.long_description ? String(c.long_description).slice(0, 2500) : null,
      domain,
      stack: detectStack(signal),
      country: c.all_locations || null,
    };
  });

  return { leads, nextCursor: { offset: nextOffset, pool: pool.length } };
}
