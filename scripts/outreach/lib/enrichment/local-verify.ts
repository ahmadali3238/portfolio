/**
 * Local-lane verification: confirm a business REALLY has no website before we pitch one.
 *
 * OSM's missing-`website`-tag is noisy (huge tag sparsity), so a missing tag alone is a weak
 * signal — pitching "you don't have a website" to a business that does is the failure mode.
 * This is a cheap, free guard, NOT a guarantee:
 *   - guess a few candidate domains from the business name (+ country TLDs)
 *   - DNS-resolve; for resolvers, fetch the homepage and require a NAME-TOKEN match
 *     (so a parked page / squatter / unrelated owner doesn't read as "their site")
 *   - if a matching live site is found → they HAVE a website → disqualify (`has_website`)
 *   - otherwise we couldn't find one → proceed, but the pitch HEDGES ("couldn't find a site")
 *
 * False negatives are expected (we won't guess every real domain); the hedged copy absorbs
 * that. The win is removing the obvious false targets cheaply, with zero paid APIs.
 */
import { promises as dns } from "node:dns";
import { UA } from "../sources/http";

const TLDS: Record<string, string[]> = {
  "united kingdom": ["co.uk", "uk", "com"],
  "united states": ["com", "us"],
  canada: ["ca", "com"],
  australia: ["com.au", "au", "com"],
  ireland: ["ie", "com"],
  netherlands: ["nl", "com"],
  france: ["fr", "com"],
  sweden: ["se", "com"],
  uae: ["ae", "com"],
};

export interface LocalVerifyResult {
  hasWebsite: boolean;
  url: string | null;
  email: string | null;     // opportunistically scraped if a site IS found (else null)
  checked: number;          // how many domains actually resolved + were fetched
}

/** "Zidane Barbers" → "zidanebarbers"; drops generic-suffix noise that bloats false guesses. */
function slug(name: string): string {
  return name.toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}
/** Significant name tokens (≥3 chars, not generic) used to confirm a page is really theirs. */
function nameTokens(name: string): string[] {
  const STOP = new Set(["the", "and", "ltd", "inc", "llc", "shop", "store", "salon", "cafe", "restaurant", "bar", "clinic", "studio", "co"]);
  return name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w));
}

function candidateDomains(name: string, country: string): string[] {
  const base = slug(name).slice(0, 40); // domains can't exceed 63 chars; long names get truncated, not skipped
  if (base.length < 3) return [];
  const tlds = TLDS[(country || "").toLowerCase()] || ["com"];
  return [...new Set(tlds.map((t) => `${base}.${t}`))].slice(0, 3); // cap network work at 3
}

async function fetchPage(domain: string): Promise<string | null> {
  for (const scheme of ["https", "http"]) {
    try {
      const res = await fetch(`${scheme}://${domain}/`, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(8_000),
        redirect: "follow",
      });
      if (res.ok) return await res.text();
    } catch { /* try next scheme */ }
  }
  return null;
}

function scrapeEmail(html: string, domain: string): string | null {
  const raw = html.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [];
  const root = domain.replace(/^www\./, "");
  const found = Array.from(new Set(raw.map((e) => e.toLowerCase())))
    .filter((e) => !/\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i.test(e))
    .filter((e) => e.endsWith(`@${root}`) || e.endsWith(`.${root}`));
  return found[0] || null;
}

export async function verifyNoWebsite(name: string, country: string): Promise<LocalVerifyResult> {
  const out: LocalVerifyResult = { hasWebsite: false, url: null, email: null, checked: 0 };
  const tokens = nameTokens(name);
  for (const domain of candidateDomains(name, country)) {
    let resolves = false;
    try { resolves = (await dns.resolve(domain)).length > 0; } catch { resolves = false; }
    if (!resolves) continue;
    const html = await fetchPage(domain);
    if (!html) continue;
    out.checked++;
    // require a WORD-BOUNDARY name-token match so we don't mistake a parked/unrelated domain
    // for theirs — substring matching would let "prime" (Prime Auto) hit "subprime", wrongly
    // flagging a real target as already-having-a-site and dropping it. tokens are [a-z0-9] only.
    const lc = html.toLowerCase();
    const matches = tokens.length > 0 && tokens.some((tok) => new RegExp(`\\b${tok}\\b`).test(lc));
    if (matches) {
      out.hasWebsite = true;
      out.url = `https://${domain}`;
      out.email = scrapeEmail(html, domain);
      break;
    }
  }
  return out;
}
