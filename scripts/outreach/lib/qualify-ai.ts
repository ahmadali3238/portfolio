/**
 * AI quality gauntlet (pattern from de-reply-classifier's brand-vs-reseller check):
 * a free Groq/Gemini judgment pass before drafting — "is this a genuine UAE/Gulf asset /
 * inventory / warehouse / RFID role that Ahmad is actually qualified for and should spend a
 * tailored application on?" FAIL-OPEN: an LLM error never discards a lead.
 */
import { generateJSON } from "./llm";

export const GAUNTLET_PROMPT_VERSION = "g7";

export interface GauntletVerdict {
  qualified: boolean;
  confidence: number;       // 0–1
  reason: string;           // short, stored as the audit reason when rejected
}

const SYSTEM = "You are a strict job-fit qualifier for a UAE-based asset/inventory specialist. Output ONLY valid JSON.";

export interface GauntletLead {
  company: string; signal: string; segment: string; country?: string | null;
  description?: string | null;
  requiredYears?: number | null;   // parsed explicit requirement (static gate already rejected > myYears)
  myYears?: number;                // Ahmad's experience, from config
}

/** Legacy "local no-website" lane — NOT used in the UAE Job-Finder config (the segment is
 *  dropped), kept only so the union stays exhaustive. Never reached in normal operation. */
function localPrompt(lead: GauntletLead): string {
  return `A local web developer offers LOCAL small businesses a FREE basic website (paid only if
they later want extras). Decide if this business is worth one of his ~8 daily local-outreach slots.

BUSINESS:
- Name: ${lead.company}
- Country: ${lead.country || "unknown"}
- What it is: ${lead.signal}${lead.description ? `\n- Details: ${lead.description.slice(0, 600)}` : ""}

QUALIFY (true) when it's a genuine independent local business (a shop, salon, café,
restaurant, clinic, tradesperson, studio, etc.) that plausibly has no real website and would
benefit from a simple one.

REJECT (false) when it's any of:
- a chain / franchise / well-known brand (already has a corporate website + web team)
- not actually a business you'd build a marketing site for: a public toilet, ATM, bus stop,
  parking, vending machine, government/council facility, place of worship, school, hospital
- adult/gambling or anything sketchy
- clearly a large company or one that obviously already has a professional web presence

Return ONLY JSON: {"qualified": true|false, "confidence": 0.0-1.0, "reason": "<max 12 words>"}`;
}

function prompt(lead: GauntletLead): string {
  if (lead.segment === "local_no_website") return localPrompt(lead);
  const myYears = lead.myYears ?? 7;
  return `Ahmad Ali is a UAE-based asset planning / fixed-asset / inventory / warehouse specialist
with ${myYears}+ years' experience in Dubai (RFID & barcode fixed-asset tagging, asset registers,
physical verification & reconciliation, cycle counts, stock/inventory control, warehouse
supervision, and broadcast/live-production asset planning). Decide whether this job posting is a
genuine, suitable role he is qualified for and should spend a tailored application on.

JOB POSTING:
- Company: ${lead.company}
- Location: ${lead.country || "unknown"}
- Role signal: ${lead.signal}${lead.requiredYears != null ? `\n- Stated experience requirement: ${lead.requiredYears}+ years` : ""}${lead.description ? `\n- Full posting (excerpt): ${lead.description.slice(0, 1200)}` : ""}

QUALIFY (true) when it is a genuine asset / fixed-asset / inventory / stock / materials /
warehouse / stores / RFID-tagging / asset-tracking role (officer, controller, coordinator,
specialist, supervisor, storekeeper, etc.) located in the UAE or the wider Gulf (UAE, Qatar,
Saudi Arabia/KSA, Bahrain, Kuwait, Oman) that a 7-year specialist could credibly fill.

REJECT (false) when it is any of:
- NOT in the UAE or the Gulf (a non-Gulf location — e.g. US/UK/EU/India/remote-only with no
  Gulf eligibility)
- a pure software-development / IT / programming / engineering-software role (developer, data
  engineer, devops, designer) — his field is physical asset & inventory operations, not coding
- a finance-only / pure-accounting role (financial accountant, AP/AR, auditor of the books) —
  he handles the PHYSICAL fixed-asset register and counts, not financial accounting/IFRS
- a role that hard-requires a degree, professional certification, or licence he lacks, or
  demands more than ${myYears} years or a clearly senior level (manager/director/head) he can't
  credibly claim
- a wholly different domain (sales, marketing, nursing, hospitality service, driver-only,
  mechanical/electrical engineering, software QA, etc.)
- a recruiting/staffing-agency advert with no real role, crypto/gambling/adult spam, or a
  sketchy/no-real-employer operation
- it is an INDIVIDUAL JOB-SEEKER advertising themselves, not an employer hiring (first-person
  "I'm available / open to opportunities", a personal CV link, or a "company" field that is a
  template fragment like "Location: …")

When the role is plausibly an asset/inventory/warehouse role in the Gulf but the posting is
thin, lean QUALIFY (a tailored application is cheap; a missed Gulf role is not).

Return ONLY JSON: {"qualified": true|false, "confidence": 0.0-1.0, "reason": "<max 12 words>"}`;
}

export async function runGauntlet(lead: GauntletLead): Promise<GauntletVerdict> {
  try {
    const v = await generateJSON<GauntletVerdict>(SYSTEM, prompt(lead));
    return {
      qualified: Boolean(v.qualified),
      confidence: Math.max(0, Math.min(1, Number(v.confidence) || 0)),
      reason: String(v.reason || "").slice(0, 120),
    };
  } catch (e) {
    // fail-open: never lose a lead to an API hiccup
    console.error(`  (gauntlet) LLM error for ${lead.company} — passing through:`, (e as Error).message);
    return { qualified: true, confidence: 0, reason: "gauntlet_error_fail_open" };
  }
}
