/**
 * Personalization for the LOCAL "no website yet" lane (segment `local_no_website`).
 *
 * Completely different from the job-application personalizer: the pitch is "I'll build you a
 * basic website/MVP for free; you only pay if you later want enhancements." The output doubles
 * as a WhatsApp message AND an email body, so it's short, plain, link-light, and — critically —
 * HEDGED: we can't be certain they have no site (OSM tag sparsity + best-effort verify), so the
 * opener says "couldn't find a website for you" rather than asserting they have none.
 */
import type { OutreachConfig } from "./config";
import type { DraftedEmail } from "./personalize";
import { generateJSON } from "./llm";

export const LOCAL_PROMPT_VERSION = "lp1";

const SYSTEM =
  "You write short, warm, no-jargon outreach to small local business owners. Many are not " +
  "technical. You output ONLY valid JSON. No markdown, no preamble.";

export interface LocalLead {
  company: string;
  category?: string | null;   // e.g. "salon/beauty", "restaurant/café"
  city?: string | null;
  country?: string | null;
  signal?: string | null;
  description?: string | null;
}

// A live, real example of website work to cite as proof (truthful — both are shipped).
function proofLine(cfg: OutreachConfig, category: string): { text: string; url: string } {
  const food = /food|restaurant|caf|cuisine|bar/i.test(category);
  return food
    ? { text: "a restaurant site I built with online menu + bookings", url: "https://dinewithfoody.vercel.app" }
    : { text: "my portfolio of sites I've built", url: cfg.portfolioUrl };
}

function prompt(lead: LocalLead, cfg: OutreachConfig): string {
  const category = lead.category || "local business";
  const proof = proofLine(cfg, category);
  return `WHO IS SENDING: ${cfg.fromName}, a freelance web developer.
THE BUSINESS: "${lead.company}" — a ${category}${lead.city ? ` in ${lead.city}` : ""}${lead.country ? `, ${lead.country}` : ""}.
WHAT WE KNOW: We could NOT find a website for them online (they may have none, or only a social page).

WRITE a first-contact message (works as BOTH a WhatsApp message and a short email) offering this:
- You'll build them a BASIC website for FREE — a clean few-page site (home, their services/menu,
  hours, contact, a map). No catch, no cost for the basic site.
- If they later want EXTRAS — online booking/ordering, a custom domain + email, SEO, photos —
  that's the paid part. Mention this briefly and positively, not as a hard sell.
- Cite proof ONCE, naturally: "${proof.text}" (${proof.url}).

NON-NEGOTIABLE RULES:
- 45–90 words. Plain text. No markdown. Warm and human, like a real person who walked past
  their shop — not a marketing blast.
- HEDGE the opener: say you "couldn't find a website for ${lead.company}" — NEVER state as fact
  that they have none (they might). If they already have one, the message must still read fine.
- Use their business name and what they do. Be specific to a ${category}, not generic.
- ONE soft CTA: reply / a quick call / "want me to put a draft together?". Said once.
- The ONLY URL allowed in the body is ${proof.url}. Never invent any other link, phone, or email.
- BANNED phrases: "I hope this finds you well", "I came across", "boost your online presence",
  "in today's digital world", "take your business to the next level", "I'd love to discuss",
  "grow your business", "leverage".

Return ONLY JSON: {"subject":"...","body":"..."}`;
}

/** Keep the body link-clean: only the proof URL and the portfolio URL survive; anything else
 *  the LLM invents is dropped (never rewritten to a wrong destination). */
function stripStrayUrls(body: string, allow: string[]): string {
  const ok = new Set(allow.filter(Boolean).map((u) => u.replace(/\/$/, "").toLowerCase()));
  return body.replace(/https?:\/\/[^\s<>"')\]]+/gi, (url) => {
    const clean = url.replace(/[.,;]$/, "").replace(/\/$/, "").toLowerCase();
    return ok.has(clean) ? url : "";
  }).replace(/\(\s*\)/g, "").replace(/[ \t]{2,}/g, " ");
}

export async function personalizeLocal(lead: LocalLead, cfg: OutreachConfig): Promise<DraftedEmail> {
  const category = lead.category || "local business";
  const proof = proofLine(cfg, category);
  const out = await generateJSON<{ subject: string; body: string }>(SYSTEM, prompt(lead, cfg));

  const cleanBody = stripStrayUrls((out.body || "").trim(), [proof.url, cfg.portfolioUrl]);
  // minimal signature — no resume/GitHub/LinkedIn dump (this isn't a job application), and a
  // soft, channel-appropriate opt-out that reads fine on WhatsApp or email.
  const footer = `\n\n— ${cfg.fromName} · ${cfg.portfolioUrl}\nNot interested? Just reply "no" and I won't message again.`;
  const subject = (out.subject || `A free website for ${lead.company}`).slice(0, 140);

  return {
    subject,
    altSubject: subject,
    body: `${cleanBody}${footer}`,
    attachments: { resume: false, coverLetter: false },
    analysis: null,
    flags: { resume: false, coverLetter: false, links: [], applyForm: false, fullTimeOnly: false, rateAsk: false, videoAsk: false, subjectTokens: [] },
    aiMeta: {
      provider: process.env.OUTREACH_LLM_PROVIDER || "groq",
      promptVersion: LOCAL_PROMPT_VERSION,
      channel: "whatsapp",
      proof: proof.url,
    },
  };
}
