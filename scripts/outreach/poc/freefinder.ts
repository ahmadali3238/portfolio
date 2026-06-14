/**
 * PoC — FREE email finder (no third party, no API key, ToS-safe).
 * The only truly-free *automated* enrichment: scrape a company's public pages for
 * published emails, pattern-guess role addresses, and MX-check the domain.
 *
 * Run: tsx scripts/outreach/poc/freefinder.ts <domain> [First] [Last]
 * e.g. tsx scripts/outreach/poc/freefinder.ts kanary.com
 */
import { promises as dns } from "node:dns";

const UA = "Mozilla/5.0 (compatible; JobFinderPoC/1.0; +https://ahmadali3238.vercel.app)";
const TIMEOUT_MS = 12_000;

const JUNK = /\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i;
const JUNK_DOMAINS = ["example.com", "sentry.io", "wixpress.com", "schema.org", "w3.org",
  "googleapis.com", "gstatic.com", "cloudflare.com", "github.com"];

const domain = (process.argv[2] || "kanary.com").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
const first = (process.argv[3] || "").toLowerCase();
const last = (process.argv[4] || "").toLowerCase();

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "follow" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractEmails(html: string): string[] {
  const raw = html.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [];
  return Array.from(new Set(raw.map((e) => e.toLowerCase())))
    .filter((e) => !JUNK.test(e) && !JUNK_DOMAINS.some((d) => e.endsWith(d)));
}

async function main() {
  console.log(`→ FREE finder for: ${domain}${first ? ` (${first} ${last})` : ""}\n`);

  // 1) MX check — can this domain receive mail at all? (free, reliable)
  let mx: string[] = [];
  try {
    mx = (await dns.resolveMx(domain)).sort((a, b) => a.priority - b.priority).map((m) => m.exchange);
    console.log(`✓ MX records (${mx.length}): ${mx.slice(0, 3).join(", ")}`);
  } catch {
    console.log("✗ No MX records — domain can't receive email. Skip.");
  }

  // 2) Scrape public pages for published emails (free)
  const pages = ["", "contact", "contact-us", "about", "about-us", "team", "company"];
  const found = new Set<string>();
  for (const p of pages) {
    const html = await fetchText(`https://${domain}/${p}`);
    if (!html) continue;
    for (const e of extractEmails(html)) {
      if (e.endsWith("@" + domain)) found.add(e); // prefer same-domain
      else if (!found.size) found.add(e);
    }
  }
  const sameDomain = [...found].filter((e) => e.endsWith("@" + domain));
  console.log(`\n→ Published emails scraped: ${sameDomain.length ? sameDomain.join(", ") : "none on common pages"}`);

  // 3) Pattern-guess (only useful if MX exists; verification of mailbox is NOT free/reliable)
  const guesses: string[] = [];
  if (first && mx.length) {
    guesses.push(`${first}@${domain}`, `${first}.${last}@${domain}`, `${first}${last}@${domain}`, `${first[0]}${last}@${domain}`);
    console.log(`\n→ Pattern guesses (need manual/paid verification): ${guesses.join(", ")}`);
  }

  console.log("\n" + "─".repeat(64));
  const verdict = sameDomain.length
    ? `FOUND a published email for free.`
    : mx.length
      ? `No published email, but domain accepts mail → pattern-guess or use a free extension manually.`
      : `Dead end → skip this lead.`;
  console.log("VERDICT:", verdict);
  console.log("\nNote: published-email scraping works on ~small/startup sites that list a");
  console.log("contact address; big companies hide them. This is the honest free hit-rate.");
}

main().catch((e) => { console.error("✗ free finder failed:", e.message); process.exit(1); });
