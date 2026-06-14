/** Enrichment waterfall (§1.6): free-first, ToS-safe. Default = inpost → freefinder.
 *  Paid providers (prospeo/hunter/bettercontact) are intentionally NOT wired here —
 *  their free tiers have no API. Add them only behind a paid plan. */
import { freeFind } from "./free-finder";

export interface EnrichInput { email?: string | null; domain?: string | null; company: string; personName?: string | null; }
export interface EnrichResult { email: string | null; emailStatus: string; provider: string; }

export async function enrich(lead: EnrichInput, providers: string[]): Promise<EnrichResult> {
  for (const p of providers) {
    if (p === "inpost") {
      if (lead.email) return { email: lead.email, emailStatus: "in_post", provider: "inpost" };
    } else if (p === "freefinder") {
      const r = await freeFind(lead.domain || null);
      if (r.email) return { email: r.email, emailStatus: r.status, provider: "freefinder" };
    } else {
      // paid providers (prospeo/hunter/bettercontact) — off by default; require a paid API plan.
      console.error(`Enrich provider "${p}" requires a paid API plan — skipped (free tiers have no API).`);
    }
  }
  return { email: null, emailStatus: "not_found", provider: "none" };
}
