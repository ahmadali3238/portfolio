/** Country inference + geo tiering — UAE/Gulf edition.
 *  Ahmad is a UAE-based job seeker, so the UAE and the wider Gulf (GCC) are the TIER-1
 *  (highest-scoring) targets. The original model favoured remote/US/UK/EU buyer markets and
 *  treated some EU countries as "email-blocked"; that is irrelevant here. The function
 *  signatures and the `GeoResult` shape are unchanged so the rest of the pipeline still
 *  compiles. The real geo filter is the config `targetCountries` allow-list (UAE/Gulf). */

// Tier-1 = the UAE and the rest of the GCC — the roles Ahmad actually wants (on-site Gulf).
const TIER1 = ["uae", "united arab emirates", "dubai", "abu dhabi", "sharjah", "ajman",
  "ras al khaimah", "fujairah", "umm al quwain",
  "qatar", "saudi arabia", "ksa", "bahrain", "kuwait", "oman"];
// Tier-2 = adjacent MENA markets that occasionally carry relevant Gulf-style roles.
const TIER2 = ["egypt", "jordan", "lebanon"];
// No "email-blocked" regime applies to a UAE job search — kept empty so nothing UAE-relevant
// is ever marked blocked. (Retained as an export-free local for shape parity with the original.)
const EMAIL_BLOCKED: string[] = [];

// Common Gulf cities → their country, so a posting that only names a city still classifies.
const CITY_COUNTRY: Record<string, string> = {
  dubai: "uae", "abu dhabi": "uae", sharjah: "uae", ajman: "uae",
  "ras al khaimah": "uae", fujairah: "uae", "umm al quwain": "uae",
  doha: "qatar", riyadh: "saudi arabia", jeddah: "saudi arabia", dammam: "saudi arabia",
  manama: "bahrain", "kuwait city": "kuwait", muscat: "oman",
};

export function inferCountry(text: string): string | null {
  const t = (text || "").toLowerCase();
  if (/\b(worldwide|anywhere|global|remote\s*[-–]\s*global)\b/.test(t)) return "remote-worldwide";
  for (const c of [...TIER1, ...TIER2, ...EMAIL_BLOCKED]) {
    if (new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t)) return c;
  }
  for (const [city, country] of Object.entries(CITY_COUNTRY)) {
    if (new RegExp(`\\b${city}\\b`).test(t)) return country;
  }
  return null;
}

export interface GeoResult { country: string | null; tier: number | null; geoScore: number; blocked: boolean; excluded: boolean; }

export function classifyGeo(
  country: string | null,
  excludeCountries: string[],
  targetCountries: string[],
): GeoResult {
  const c = (country || "").toLowerCase();
  if (c && excludeCountries.includes(c)) return { country, tier: null, geoScore: -100, blocked: false, excluded: true };
  // When a target allow-list is set (UAE/Gulf), anything outside it is excluded — the whole
  // point is to surface only Gulf roles. "remote-worldwide" is allowed through (a UAE-eligible
  // remote role is still worth surfacing).
  if (targetCountries.length && c && !targetCountries.map((x) => x.toLowerCase()).includes(c) && c !== "remote-worldwide")
    return { country, tier: null, geoScore: -100, blocked: false, excluded: true };
  if (EMAIL_BLOCKED.includes(c)) return { country, tier: 1, geoScore: 10, blocked: true, excluded: false };
  if (c === "remote-worldwide" || TIER1.includes(c)) return { country, tier: 1, geoScore: 25, blocked: false, excluded: false };
  if (TIER2.includes(c)) return { country, tier: 2, geoScore: 12, blocked: false, excluded: false };
  return { country, tier: null, geoScore: 0, blocked: false, excluded: false }; // unknown — neutral
}
