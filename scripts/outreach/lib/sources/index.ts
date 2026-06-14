/** Source registry + runner. Each adapter fails soft: a broken source logs and is skipped,
 *  the others keep running. Cursor-aware adapters (hn, yc) receive their stored cursor and
 *  return the next one, so nightly runs mine deeper instead of re-reading the top. */
import type { RawLead } from "../types";
import { getSourceCursor } from "../state";
import { fetchHN } from "./hn";
import { fetchRemoteOK } from "./remoteok";
import { fetchWWR } from "./wwr";
import { fetchYC } from "./yc";
import { fetchHimalayas } from "./himalayas";
import { fetchOSM } from "./osm";
import { fetchJSearch } from "./jsearch";
import { fetchCareerjet } from "./careerjet";
import { fetchJooble } from "./jooble";

export interface SourceResult { leads: RawLead[]; nextCursor?: Record<string, any> }
type Adapter = (cursor: Record<string, any> | null) => Promise<SourceResult>;

const REGISTRY: Record<string, Adapter> = {
  // ── Active UAE/GCC job-board adapters (fail soft → [] when their API key is absent) ──
  jsearch: async () => ({ leads: await fetchJSearch() }),     // JSearch (OpenWeb Ninja) — country=ae, JSEARCH_API_KEY/RAPIDAPI_KEY
  careerjet: async () => ({ leads: await fetchCareerjet() }), // Careerjet en_AE locale — CAREERJET_AFFID
  jooble: async () => ({ leads: await fetchJooble() }),       // Jooble REST — JOOBLE_API_KEY
  // ── Legacy remote-tech adapters (kept for reference; not listed in outreach.config.json) ──
  hn: fetchHN,
  remoteok: async () => ({ leads: await fetchRemoteOK() }), // fixed feed — no pagination exists
  wwr: async () => ({ leads: await fetchWWR() }),           // fixed RSS — no pagination exists
  yc: fetchYC,
  himalayas: async () => ({ leads: await fetchHimalayas() }), // search API, sort=recent — dedupe covers re-reads
  osm: (cursor) => fetchOSM(cursor, Number(process.env.OUTREACH_OSM_QUERIES_PER_RUN) || 5), // local-business lane; cursor rotates city×category
};

export async function collectLeads(sources: string[]): Promise<{
  leads: RawLead[];
  perSource: Record<string, number | string>;
  cursors: Record<string, Record<string, any>>;
}> {
  const leads: RawLead[] = [];
  const perSource: Record<string, number | string> = {};
  const cursors: Record<string, Record<string, any>> = {};
  for (const name of sources) {
    const fn = REGISTRY[name];
    if (!fn) { perSource[name] = "unknown source"; continue; }
    try {
      const cursor = await getSourceCursor(name);
      const result = await fn(cursor);
      leads.push(...result.leads);
      perSource[name] = result.leads.length;
      if (result.nextCursor) cursors[name] = result.nextCursor;
    } catch (e) {
      perSource[name] = `FAILED: ${(e as Error).message}`;
      console.error(`Source "${name}" failed (skipped):`, (e as Error).message);
    }
  }
  return { leads, perSource, cursors };
}

export const KNOWN_SOURCES = Object.keys(REGISTRY);
