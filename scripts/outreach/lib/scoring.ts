/** 0–100 job-listing relevance: asset/inventory keyword density + geo (UAE/Gulf) + freshness.
 *  Ahmad is a UAE-based JOB SEEKER who WANTS on-site Dubai/Gulf roles, so there is no remote
 *  bonus and no on-site penalty — the polarity is inverted from the original remote-contractor
 *  scorer. A typical Dubai asset/inventory posting (several keyword hits + tier-1 geo + a
 *  hiring_signal) comfortably clears the default minScore (55). */
import type { RawLead } from "./types";
import type { GeoResult } from "./geo";
import { matchedKeywords } from "./text";

export function scoreLead(lead: RawLead, keywords: string[], geo: GeoResult): number {
  // description included: titles like "Acme | Inventory Controller | Dubai" carry the
  // asset/inventory vocabulary in the body. Word-boundary matching keeps this honest.
  const hay = `${lead.company} ${lead.signal || ""} ${(lead.stack || []).join(" ")} ${lead.description || ""}`;
  const keywordHits = matchedKeywords(hay, keywords).length;

  let score = Math.min(keywordHits * 9, 45);     // up to 45 for asset/inventory keyword density
  score += geo.geoScore;                         // +25 tier1 (UAE/Gulf) / +12 tier2 / -100 excluded
  if (lead.email) score += 15;                   // in-post email = warmer + free to reach
  if (lead.segment === "hiring_signal") score += 10; // an active, open role
  if (lead.postedAt) {                           // fresh posts get filled fast — prioritise them
    const days = (Date.now() - Date.parse(lead.postedAt)) / 86_400_000;
    if (days >= 0 && days <= 7) score += 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Local "no website" lane scores on a different axis entirely: no stack keywords apply.
 *  What matters is contactability (a usable phone), pitch-fit (category), and completeness
 *  (a street address ⇒ a real, locatable storefront, not a stray map node). */
export function scoreLocalLead(lead: RawLead, geo: GeoResult): number {
  const sr = (lead.signalRaw || {}) as Record<string, unknown>;
  let score = 50;                                 // baseline — every local lead is on-topic by construction
  if (sr.waPhone) score += 18;                    // a reachable phone IS the channel
  if (sr.address) score += 12;                    // real storefront with an address
  // beauty/health convert best (highest phone% + cleanest free-site pitch); food/trades next
  if (/beauty|health/.test(String(sr.category || ""))) score += 8;
  else if (/food|trades/.test(String(sr.category || ""))) score += 4;
  if (sr.openingHours) score += 3;                // staffed, operating business
  score += Math.min(geo.geoScore, 10);            // keep geo a minor nudge (cities are all tier-1)
  return Math.max(0, Math.min(100, Math.round(score)));
}
