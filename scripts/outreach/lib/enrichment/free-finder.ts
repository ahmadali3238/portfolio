/** FREE email finder — proven live (kanary/starbridge/goshop). Scrapes a company's public
 *  pages for a published email + MX-checks the domain. No third party, no API key. */
import { promises as dns } from "node:dns";
import { UA } from "../sources/http";

const JUNK = /\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i;
const JUNK_DOMAINS = ["example.com", "sentry.io", "wixpress.com", "schema.org", "w3.org",
  "googleapis.com", "gstatic.com", "cloudflare.com", "github.com", "sentry-cdn.com"];

async function page(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10_000), redirect: "follow" });
    return res.ok ? await res.text() : null;
  } catch { return null; }
}

function emails(html: string, domain: string): string[] {
  const raw = html.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [];
  return Array.from(new Set(raw.map((e) => e.toLowerCase())))
    .filter((e) => !JUNK.test(e) && !JUNK_DOMAINS.some((d) => e.endsWith(d)))
    .filter((e) => e.endsWith("@" + domain)); // same-domain only (avoids vendor noise)
}

export async function freeFind(domain: string | null): Promise<{ email: string | null; status: string }> {
  if (!domain) return { email: null, status: "no_domain" };

  let mx = false;
  try { mx = (await dns.resolveMx(domain)).length > 0; } catch { mx = false; }
  if (!mx) return { email: null, status: "no_mx" };

  for (const p of ["", "contact", "contact-us", "about", "about-us", "team", "company"]) {
    const html = await page(`https://${domain}/${p}`);
    if (!html) continue;
    const found = emails(html, domain);
    if (found.length) {
      // prefer a personal-looking address over generic, else first
      const personal = found.find((e) => !/^(info|hello|contact|support|admin|sales|team)@/.test(e));
      return { email: personal || found[0], status: "scraped" };
    }
  }
  return { email: null, status: "mx_only" };
}
