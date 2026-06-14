/**
 * OSM Overpass — the local-business "no website yet" lane (segment `local_no_website`).
 *
 * Free, keyless, no credit card, ToS-clean (ODbL, internal lead-gen use is fine). Verified
 * live June 2026: overpass-api.de answered every query, <2 min stale, 10k+ no-website-tagged
 * businesses per city core. We query tier-1 city cores × high-contactability categories,
 * keeping ONLY rows that (a) have no website tag and (b) carry a phone — because the realistic
 * channel for these is WhatsApp/phone, NOT email (OSM email coverage is ~0%).
 *
 * TWO things the data forces (see docs/outreach §4e):
 *  1. Phone-required server-side (`[~"^(phone|contact:phone)$"~"."]`) so every lead is contactable.
 *  2. "No website TAG" ≠ "no website" — OSM tag sparsity is huge. So enrich.ts re-verifies
 *     cheaply (domain guess → DNS+HTTP) before drafting, and the pitch HEDGES ("couldn't find
 *     a site for you") rather than asserting they have none.
 *
 * Fair use (OSM wiki): main instance is fine under 10k queries/day & 2 concurrent slots; a
 * nightly 4–8 sequential queries is ~0.1% of the allowance. We send an identifying User-Agent
 * and pace queries. Cursor { i } rotates through the (city × category) combo list so nightly
 * runs cover new slices instead of re-reading the same one.
 */
import type { RawLead } from "../types";
import type { SourceResult } from "./index";
import { UA } from "./http";

// overpass-api.de primary; private.coffee (the renamed kumi endpoint) + mail.ru as fallbacks.
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const PER_QUERY_CAP = 120;        // `out tags center` cap per query — plenty per city/category
const PACE_MS = 3_500;            // be a polite Overpass citizen between sequential queries

interface City { name: string; country: string; cc: string; bbox: [number, number, number, number] } // bbox = S,W,N,E
// Central cores only (verified to return thousands/category). UK + North America first —
// Dubai phone-tagging is ~3× worse, so it sits last in priority.
const CITIES: City[] = [
  { name: "London",    country: "united kingdom", cc: "44",  bbox: [51.49, -0.16, 51.54, -0.07] },
  { name: "Toronto",   country: "canada",         cc: "1",   bbox: [43.63, -79.42, 43.70, -79.36] },
  { name: "New York",  country: "united states",  cc: "1",   bbox: [40.70, -74.02, 40.80, -73.94] },
  { name: "San Francisco", country: "united states", cc: "1", bbox: [37.74, -122.46, 37.80, -122.39] },
  { name: "Sydney",    country: "australia",      cc: "61",  bbox: [-33.89, 151.18, -33.85, 151.23] },
  { name: "Dublin",    country: "ireland",        cc: "353", bbox: [53.33, -6.30, 53.36, -6.23] },
  { name: "Amsterdam", country: "netherlands",    cc: "31",  bbox: [52.35, 4.86, 52.39, 4.94] },
  { name: "Paris",     country: "france",         cc: "33",  bbox: [48.84, 2.31, 48.88, 2.39] },
  { name: "Stockholm", country: "sweden",         cc: "46",  bbox: [59.31, 18.04, 59.35, 18.10] },
  { name: "Dubai",     country: "uae",            cc: "971", bbox: [25.18, 55.24, 25.27, 55.33] },
];

interface Category { key: string; label: string; filter: string }
// Priority = contactability + pitch-fit (from the live audit): beauty/health phone% highest.
const CATEGORIES: Category[] = [
  { key: "beauty", label: "salon/beauty",  filter: `["shop"~"^(hairdresser|beauty)$"]` },
  { key: "health", label: "dental/clinic", filter: `["amenity"~"^(dentist|doctors|clinic)$"]` },
  { key: "food",   label: "restaurant/café", filter: `["amenity"~"^(restaurant|cafe)$"]` },
  { key: "trades", label: "trades/craft",  filter: `["craft"]` },
];

// Combo order: high-yield category across all cities, then next category — so the first few
// queries each night (the ones a run actually fires) are always the best-converting slices.
const COMBOS: { city: City; cat: Category }[] = CATEGORIES.flatMap((cat) => CITIES.map((city) => ({ city, cat })));

// Obvious chains/franchises: a corporate site already exists and a free-site pitch is pointless.
// (The AI gauntlet catches the long tail; this just drops the cheap, certain cases.)
const CHAIN = /\b(mcdonald|starbucks|kfc|subway|burger king|domino|pizza hut|costa|greggs|pret|tim hortons|dunkin|nando|wagamama|five guys|taco bell|popeyes|wendy|chipotle|h&m|zara|uniqlo|boots|superdrug|walgreens|cvs|7[- ]?eleven|shell|esso|bp|tesco|sainsbury|aldi|lidl|walmart|ikea|vodafone|o2|three|starbucks)\b/i;

/** Normalize an OSM phone to a wa.me-ready international number (digits only, no +).
 *  OSM guidance is E.164 (`+44 20 …`); national-format numbers get the city's calling code.
 *  A malformed/too-short number returns null rather than risk WhatsApping an uninvolved person. */
export function toWaPhone(raw: string | null | undefined, cc: string): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  let digits = s.replace(/\D/g, "");
  if (!digits) return null;
  if (s.startsWith("+")) {
    // already international: the dropped "+" means digits = country code + subscriber
  } else if (s.startsWith("00")) {
    digits = digits.replace(/^00/, "");          // "00" = intl access prefix → strip it
    // a stray trunk 0 after that (e.g. "00 020 …" — intl prefix glued to a national number)
    // means the country code is missing → treat the remainder as national and prepend cc
    if (digits.startsWith("0")) digits = `${cc}${digits.replace(/^0+/, "")}`;
  } else {
    // national format: strip the trunk-prefix 0 (UK/AU/NL/IE/FR/SE all use it) and prepend cc
    digits = `${cc}${digits.replace(/^0+/, "")}`;
  }
  if (digits.length < 8 || digits.length > 15) return null; // E.164 sanity — drop garbage
  return digits;
}

function buildQuery(city: City, cat: Category): string {
  const [s, w, n, e] = city.bbox;
  // no website (either tag) + has a phone-ish key with a value → contactable, untapped.
  const f = `${cat.filter}[!"website"][!"contact:website"][~"^(phone|contact:phone)$"~"."]`;
  return `[out:json][timeout:60];nwr${f}(${s},${w},${n},${e});out tags center ${PER_QUERY_CAP};`;
}

async function runQuery(ql: string): Promise<any[]> {
  let lastErr: Error | null = null;
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({ data: ql }).toString(),
        signal: AbortSignal.timeout(45_000),
      });
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
      const j = await res.json();
      return Array.isArray(j?.elements) ? j.elements : [];
    } catch (err) {
      lastErr = err as Error; // try the next mirror
    }
  }
  throw lastErr || new Error("all Overpass endpoints failed");
}

function addressOf(t: Record<string, string>): string {
  const parts = [
    [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" "),
    t["addr:city"], t["addr:postcode"],
  ].filter(Boolean);
  return parts.join(", ");
}

function elementToLead(el: any, city: City, cat: Category): RawLead | null {
  const t: Record<string, string> = el?.tags || {};
  const name = (t.name || t["name:en"] || "").trim();
  if (!name || name.length < 2) return null;          // unnamed nodes are unusable
  if (t.brand || CHAIN.test(name)) return null;        // chain/franchise → already has a site
  const waPhone = toWaPhone(t.phone || t["contact:phone"], city.cc);
  if (!waPhone) return null;                           // phone is the whole point of this lane
  const displayPhone = (t.phone || t["contact:phone"] || "").trim();
  const address = addressOf(t);
  const cuisine = t.cuisine ? ` (${t.cuisine.replace(/_/g, " ")})` : "";
  const desc =
    `${name} — ${cat.label}${cuisine} in ${city.name}, ${city.country}. ` +
    `${address ? `Address: ${address}. ` : ""}${t.opening_hours ? `Hours: ${t.opening_hours}. ` : ""}` +
    `Phone: ${displayPhone}. No website found in public map data — a candidate for a free starter site.`;
  const lat = el.lat ?? el.center?.lat ?? null;
  const lon = el.lon ?? el.center?.lon ?? null;
  return {
    company: name.slice(0, 80),
    segment: "local_no_website",
    source: "osm",
    sourceUrl: el.type && el.id ? `https://www.openstreetmap.org/${el.type}/${el.id}` : null,
    signal: `${cat.label} in ${city.name} — no website, phone listed`,
    signalRaw: {
      osmType: el.type, osmId: el.id, category: cat.key, categoryLabel: cat.label,
      city: city.name, address, waPhone, displayPhone,
      openingHours: t.opening_hours || null, cuisine: t.cuisine || null, lat, lon,
    },
    postedAt: null,
    description: desc.slice(0, 2500),
    email: null,
    phone: displayPhone || null,
    stack: [],
    country: city.country,
  };
}

/**
 * Run `queriesPerRun` consecutive (city × category) combos starting at the cursor, rotating.
 * Each combo is one Overpass POST; we pace between them. Fail-soft per combo (one bad query
 * doesn't sink the rest), and fail-soft overall (the source registry already swallows throws).
 */
export async function fetchOSM(cursor: Record<string, any> | null, queriesPerRun = 5): Promise<SourceResult> {
  const start = Number(cursor?.i || 0) % COMBOS.length;
  const n = Math.max(1, Math.min(queriesPerRun, COMBOS.length));
  const leads: RawLead[] = [];

  for (let k = 0; k < n; k++) {
    const { city, cat } = COMBOS[(start + k) % COMBOS.length];
    try {
      const elements = await runQuery(buildQuery(city, cat));
      for (const el of elements) {
        const lead = elementToLead(el, city, cat);
        if (lead) leads.push(lead);
      }
      console.log(`  (osm) ${city.name}/${cat.key}: ${elements.length} raw`);
    } catch (e) {
      console.error(`  (osm) ${city.name}/${cat.key} failed:`, (e as Error).message);
    }
    if (k < n - 1) await new Promise((r) => setTimeout(r, PACE_MS));
  }

  return { leads, nextCursor: { i: (start + n) % COMBOS.length, combos: COMBOS.length } };
}
