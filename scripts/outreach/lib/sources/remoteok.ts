/** RemoteOK — proven live (100 jobs). Free JSON; their terms require an attribution
 *  backlink, stored per-lead in signalRaw.attribution. */
import type { RawLead } from "../types";
import { getJson, decodeHtml, detectStack } from "./http";

// unfiltered = latest ~100 jobs (2-day window); tags=react reaches months further back
// for relevant roles the rolling window misses (staleness gate drops the truly old ones)
const FEEDS = ["https://remoteok.com/api", "https://remoteok.com/api?tags=react"];

export async function fetchRemoteOK(): Promise<RawLead[]> {
  const arr: any[] = [];
  for (const feed of FEEDS) {
    try { arr.push(...await getJson<any[]>(feed)); }
    catch (e) { console.error(`  remoteok feed failed (skipped): ${feed}`, (e as Error).message); }
  }
  const seen = new Set<string>();
  return arr
    .filter((x) => x && (x.position || x.company))
    .filter((x) => { const k = String(x.id || x.url || `${x.company}|${x.position}`); if (seen.has(k)) return false; seen.add(k); return true; })
    .map((j): RawLead => {
      // tags stay OUT of signal/stack: RemoteOK tagging is spammy (react-tagged paralegals),
      // and signal/stack feed the keyword gate + scorer. Tags remain in signalRaw for review.
      const signal = `${j.position || ""} — ${j.location || "remote"}`;
      let domain: string | null = null;
      try { if (j.apply_url || j.url) domain = new URL(j.apply_url || j.url).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
      return {
        company: String(j.company || "(unknown)").slice(0, 80),
        segment: "hiring_signal",
        source: "remoteok",
        sourceUrl: j.url || j.apply_url || null,
        signal: signal.slice(0, 240),
        signalRaw: { tags: j.tags, location: j.location, attribution: "Source: RemoteOK — https://remoteok.com" },
        postedAt: j.date || null,
        description: j.description ? decodeHtml(String(j.description)).slice(0, 2500) : null,
        domain,
        stack: detectStack(`${j.position || ""} ${j.description || ""}`),
        country: j.location || null,
      };
    });
}
