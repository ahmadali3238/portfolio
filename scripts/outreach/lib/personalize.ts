/** Personalization (§5/§5a): a two-step LLM pass — ANALYZE the posting (tone, explicit
 *  asks, application instructions, requested links), then WRITE an email that adapts its
 *  length, tone, and strategy to that analysis. Deterministic rules append the footer and
 *  ENFORCE the high-stakes bits in code (no invented URLs; required subject tokens always
 *  present), because LLM self-compliance is not a guarantee. Free (Groq/Gemini). */
import type { OutreachConfig } from "./config";
import { PROFILE, selectProofProjects } from "./profile";
import { generateJSON } from "./llm";
import { buildFooter, attachmentsFor, jdFlags, type JdFlags } from "./email-content";

export interface JdAnalysis {
  tone: string;                    // e.g. "casual-founder" | "formal-corporate" | "technical-direct"
  target_words: number;            // chosen email length
  explicit_asks: string[];         // questions/instructions the post wants answered
  links_requested: string[];       // e.g. ["github","linkedin"]
  special_instructions: string | null; // e.g. 'include the word "pineapple" in the subject'
}

export interface DraftedEmail {
  subject: string;
  altSubject: string;
  body: string;                 // full body incl. footer
  attachments: { resume: boolean; coverLetter: boolean };
  analysis: JdAnalysis | null;
  flags: JdFlags;
  aiMeta: Record<string, unknown>;
}

/** Bump when the prompt below changes — stamped into ai_meta so reply rates can be
 *  compared across prompt versions (pattern from de-reply-classifier). */
export const PROMPT_VERSION = "p5";

const SYSTEM = "You write concise, professional job-application cover notes for an experienced " +
  "UAE asset/inventory specialist. You output ONLY valid JSON. No markdown, no preamble.";

export interface PersonalizeLead { company: string; signal: string; segment: string; country?: string | null; description?: string | null }

/** Application instructions usually sit at the END of a posting — keep head AND tail. */
function excerpt(description: string, head = 700, tail = 400): string {
  if (description.length <= head + tail) return description;
  return `${description.slice(0, head)}\n[…]\n${description.slice(-tail)}`;
}

function prompt(lead: PersonalizeLead, cfg: OutreachConfig, flags: JdFlags): string {
  const projects = selectProofProjects(`${lead.company} ${lead.signal} ${lead.description || ""}`);
  const proof = projects.map((p) => `- ${p.name}: ${p.oneLiner}${p.url ? ` (link: ${p.url})` : ""}`).join("\n");

  const positioning =
    "This is a JOB APPLICATION. He is applying to THIS role. Open by naming the role and stating " +
    "he's applying, then lead with the single most directly-relevant slice of his asset / " +
    "fixed-asset / inventory / RFID / warehouse experience. Position as an experienced, ready " +
    "UAE-based specialist — not a vendor, not a contractor pitching project work, not a salesperson.";

  const rateLine = flags.rateAsk
    ? cfg.rateNote
      ? `They ask for salary/compensation expectations — state it plainly using: "${cfg.rateNote}".`
      : `They ask for salary expectations — do NOT invent a number; say it's negotiable based on the role and you're happy to discuss.`
    : "";

  return `You will do TWO steps in one response: first ANALYZE the posting, then WRITE the cover note.

WHO IS APPLYING: ${PROFILE.name} — ${PROFILE.title}, based ${PROFILE.location}. ${PROFILE.timezone}.
ABOUT HIM: ${PROFILE.blurb}

MOST RELEVANT EXPERIENCE (cite the single best fit, naturally — these are real career facts):
${proof}

THE JOB:
- Company: ${lead.company}
- Location: ${lead.country || "unknown"}
- Role: ${lead.signal}${lead.description ? `\n- Full posting (head + tail — application instructions are often at the END):\n${excerpt(lead.description)}` : ""}

POSITIONING: ${positioning}
${rateLine ? `SALARY: ${rateLine}\n` : ""}
STEP 1 — ANALYZE the posting:
- tone: mirror the employer's register (a corporate UAE posting → crisp, polite, professional; a brief listing → concise and direct). Default to courteous-professional.
- target_words: 80–170. A short listing → shorter. A detailed posting with explicit requirements deserves enough words to address the key ones — never padding.
- explicit_asks: requirements/instructions the post wants applicants to address (e.g. "must have RFID experience", "send CV to…", "state notice period").
- links_requested: which of [linkedin] the post asks applicants to share. (His only relevant public link is LinkedIn — never reference GitHub/Upwork/YouTube.)
- special_instructions: literal application quirks (e.g. a keyword/reference they want in the subject line). null if none.

STEP 2 — WRITE the cover note, OBEYING your own analysis. Non-negotiable rules:
- Exactly your target_words length (±15), plain text, no markdown. Address it generically ("Dear Hiring Manager," or "Hello,") — do NOT invent a contact name.
- THE OPENER: name the role and that you're applying, then immediately a concrete, relevant credential — e.g. "I'm applying for your [role]. I've led RFID fixed-asset tagging and reconciliation across multiple client sites and currently handle asset planning at NEP Middle East."
- TRUTH ONLY: use ONLY the real experience above. Never invent metrics, percentages, asset counts, employers, certifications, degrees, or systems/tools not stated. If the posting wants something he lacks, bridge honestly from an adjacent strength or omit — never fabricate. Do not write "you mentioned…" unless they literally did.
- ADDRESS the key explicit_asks with REAL specifics (RFID/barcode tagging, fixed-asset registers, physical verification & reconciliation, cycle counts, stock/inventory control, warehouse supervision, the warehouse-to-asset-planning promotion, broadcast/live-production asset planning, 7+ years in the UAE). If an honest answer doesn't exist, briefly note it and pivot to a strength.
- ONE clear, polite CTA (e.g. happy to discuss / available for interview), said once. Mention the CV is attached/available only when the post asks for it.
- NO PARROTING: don't echo the posting's own phrases back; respond with HIS substance.
- Reference at most one career engagement by name. Keep it grounded and specific, never salesy.
- BANNED phrases: "I hope this finds you well", "I came across", "I am writing to", "resonates with", "fast-paced environment", "align with your needs", "I'd love to discuss", "team player", "hard-working", "think outside the box", "go-getter", "wear many hats", "synergy", "dynamic environment".

Return ONLY JSON:
{"analysis":{"tone":"...","target_words":130,"explicit_asks":["..."],"links_requested":["linkedin"],"special_instructions":null},
 "subject":"...","altSubject":"...","body":"..."}`;
}

/** Code-level guarantee: no invented/broken URLs ever reach a hiring manager. A LinkedIn host
 *  is rewritten to Ahmad's REAL configured profile; anything else not explicitly allowed
 *  (his portfolio, the resume URL) is replaced with the portfolio URL. */
function sanitizeBodyUrls(body: string, cfg: OutreachConfig, allowedUrls: string[]): string {
  const allowed = new Set(allowedUrls.filter(Boolean).map((u) => u.replace(/\/$/, "").toLowerCase()));
  return body.replace(/https?:\/\/[^\s<>"')\]]+/gi, (url) => {
    const clean = url.replace(/[.,;]$/, "");
    if (allowed.has(clean.replace(/\/$/, "").toLowerCase())) return url;
    if (/linkedin\.com/i.test(clean)) return cfg.socialLinks.linkedin || cfg.portfolioUrl;
    return cfg.portfolioUrl; // unknown/invented URL → safest real destination (his portfolio)
  });
}

/** Code-level guarantee: required subject tokens (auto-archive tests) are ALWAYS present. */
function enforceSubjectTokens(subject: string, tokens: string[]): string {
  let out = subject;
  for (const t of tokens) {
    if (t && !out.toLowerCase().includes(t.toLowerCase())) out = `${t} — ${out}`;
  }
  return out;
}

export async function personalize(
  lead: PersonalizeLead,
  cfg: OutreachConfig,
): Promise<DraftedEmail> {
  // deterministic read of the FULL text — requirements usually live deep in the description
  const postText = [lead.signal, lead.description].filter(Boolean).join("\n");
  const flags = jdFlags(postText);

  const out = await generateJSON<{ analysis?: Partial<JdAnalysis>; subject: string; altSubject?: string; body: string }>(
    SYSTEM, prompt(lead, cfg, flags));

  const analysis: JdAnalysis | null = out.analysis
    ? {
        tone: String(out.analysis.tone || "neutral"),
        target_words: Number(out.analysis.target_words) || 110,
        explicit_asks: Array.isArray(out.analysis.explicit_asks) ? out.analysis.explicit_asks.map(String).slice(0, 6) : [],
        links_requested: Array.isArray(out.analysis.links_requested) ? out.analysis.links_requested.map(String) : [],
        special_instructions: out.analysis.special_instructions ? String(out.analysis.special_instructions) : null,
      }
    : null;

  const projects = selectProofProjects(`${lead.company} ${lead.signal} ${lead.description || ""}`);
  const allowedUrls = [
    ...projects.map((p) => p.url).filter(Boolean) as string[],
    cfg.portfolioUrl, cfg.bookingUrl, cfg.resumeUrl,
    ...Object.values(cfg.socialLinks),
  ];

  // LLM-quoted tokens from special_instructions ∪ deterministic JD scan — enforced in code
  const llmTokens = (analysis?.special_instructions?.match(/["'""'']([^"'""''\n]{2,40})["'""'']/g) || [])
    .map((s) => s.slice(1, -1));
  const subjectTokens = [...new Set([...flags.subjectTokens, ...llmTokens])];

  const cleanBody = sanitizeBodyUrls((out.body || "").trim(), cfg, allowedUrls);
  const subject = enforceSubjectTokens((out.subject || `Application — ${lead.company}`), subjectTokens).slice(0, 140);

  const attachments = attachmentsFor(cfg, postText);
  const footer = buildFooter(cfg, postText, { resumeAttached: attachments.resume, extraLinks: analysis?.links_requested });

  return {
    subject,
    altSubject: enforceSubjectTokens((out.altSubject || out.subject || ""), subjectTokens).slice(0, 140),
    body: `${cleanBody}\n${footer}`,
    attachments,
    analysis,
    flags,
    aiMeta: {
      provider: process.env.OUTREACH_LLM_PROVIDER || "groq",
      promptVersion: PROMPT_VERSION,
      analysis,
      flags,
      projects: projects.map((p) => p.name),
    },
  };
}
