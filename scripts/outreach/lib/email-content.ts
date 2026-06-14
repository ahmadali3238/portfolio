/** Deterministic email-content rules (§5a) — enforced in code, not left to the LLM.
 *  IMPORTANT: callers must pass the FULL post text (signal + description) — application
 *  requirements ("send your GitHub", "include a resume") usually live deep in the
 *  description, not in the 240-char signal line. */
import type { OutreachConfig } from "./config";

// noun-context required: a bare \bresume\b fires on "interviews will resume next month"
export const demandsResume = (t: string) =>
  /\b(your|a|an|attach(?:ed)?|include|send|submit|share|with|updated)\s+(?:updated\s+)?(resume|cv|c\.v\.)\b/i.test(t || "") ||
  /\b(resume|cv)\s*(?:\/|and|&|\+)\s*(cover letter|cv|resume)/i.test(t || "");
export const demandsCoverLetter = (t: string) => /cover letter/i.test(t || "");

export const KNOWN_LINK_KEYS = ["github", "linkedin", "upwork", "youtube"] as const;

export function requestedSocials(t: string): string[] {
  const out: string[] = [];
  const s = t || "";
  if (/\bgithub\b/i.test(s)) out.push("github");
  if (/\blinkedin\b/i.test(s)) out.push("linkedin"); // strict one-word: "linked in this post" must NOT match
  if (/\bupwork\b/i.test(s)) out.push("upwork");
  if (/\byoutube\b/i.test(s)) out.push("youtube");
  // request-context phrasings that imply a code/work-samples link → GitHub is the best match
  // (no bare "repo(s)" — "we manage several repos" is not an application ask)
  if (!out.includes("github") &&
      /link to (?:your )?(?:code|projects?|repo(?:s|sitory|sitories)?)|(?:code|work) samples?|samples? of your (?:code|work)|open[- ]source (?:work|contributions)/i.test(s)) {
    out.push("github");
  }
  return out;
}

/** "To apply, use the form / don't email" — emailing anyway marks the sender as a non-reader. */
export function detectsApplyForm(t: string): boolean {
  const s = t || "";
  return /(greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com|bamboohr\.com|breezy\.hr|smartrecruiters\.com|jobs\.gusto\.com)/i.test(s) ||
    /\bapply (?:at|via|through|using|on) (?:the |our )?(?:link|form|site|portal|page|website)\b/i.test(s) ||
    /\b(?:do not|don'?t) email\b|\bno emails? please\b|emails? will (?:be ignored|not be (?:read|considered))/i.test(s);
}

/** "Full-time only / no contractors" — the contractor pitch would contradict their one dealbreaker. */
export function detectsFullTimeOnly(t: string): boolean {
  return /\bno (?:agencies|recruiters|contractors|freelancers|consultants)\b|\bfull[- ]time (?:employees? )?only\b|\bonly (?:hiring )?full[- ]time\b|\bW-?2 only\b/i.test(t || "");
}

/** Post asks for rate/salary expectations. */
export function detectsRateAsk(t: string): boolean {
  return /(?:include|share|send|state|mention|tell us|with|provide)[^.\n]{0,50}\b(?:hourly )?(?:rate|salary|compensation)\b|\b(?:rate|salary|compensation) (?:expectations?|requirements?)\b/i.test(t || "");
}

/** Post asks for a Loom / video intro (we can't generate one — surface to the human). */
export function detectsVideoAsk(t: string): boolean {
  return /\b(?:loom|video (?:intro(?:duction)?|application|cover letter|message))\b/i.test(t || "");
}

/** Tokens the post REQUIRES in the subject line ("put 'lighthouse' in your subject"). */
export function requiredSubjectTokens(t: string): string[] {
  const s = t || "";
  const out: string[] = [];
  const re = /\bsubject(?: line)?\b[^.\n]{0,80}?["'""'']([^"'""''\n]{2,40})["'""'']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out.push(m[1].trim());
  // inverted phrasing: "put/include the word 'X' ... in the subject"
  const re2 = /\b(?:put|include|add|use)\b[^.\n]{0,40}?["'""'']([^"'""''\n]{2,40})["'""''][^.\n]{0,50}?\bsubject/gi;
  while ((m = re2.exec(s))) out.push(m[1].trim());
  return [...new Set(out)];
}

/** One-stop deterministic analysis of a posting's application requirements. */
export interface JdFlags {
  resume: boolean; coverLetter: boolean; links: string[];
  applyForm: boolean; fullTimeOnly: boolean; rateAsk: boolean; videoAsk: boolean;
  subjectTokens: string[];
}
export function jdFlags(postText: string): JdFlags {
  return {
    resume: demandsResume(postText),
    coverLetter: demandsCoverLetter(postText),
    links: requestedSocials(postText),
    applyForm: detectsApplyForm(postText),
    fullTimeOnly: detectsFullTimeOnly(postText),
    rateAsk: detectsRateAsk(postText),
    videoAsk: detectsVideoAsk(postText),
    subjectTokens: requiredSubjectTokens(postText),
  };
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

/** Build the signature/footer: portfolio ALWAYS, booking always (if set), requested socials
 *  (deterministic scan of the full post text ∪ LLM-detected extras), resume link (unless
 *  attached), and the mandatory compliance line. */
export function buildFooter(
  cfg: OutreachConfig,
  postText: string,
  opts: { resumeAttached?: boolean; extraLinks?: string[] } = {},
): string {
  const lines: string[] = ["", "—", `${cfg.fromName} · ${cfg.fromEmail}`];
  lines.push(`Portfolio: ${cfg.portfolioUrl}`);                       // ALWAYS
  if (cfg.bookingUrl) lines.push(`Book a quick call: ${cfg.bookingUrl}`);

  // deterministic detection (guarantee) ∪ LLM-detected asks (enhancement), deduped
  const wanted = new Set<string>(requestedSocials(postText));
  for (const k of opts.extraLinks || []) {
    const key = String(k).toLowerCase().trim();
    if ((KNOWN_LINK_KEYS as readonly string[]).includes(key)) wanted.add(key);
  }
  for (const s of KNOWN_LINK_KEYS) {
    if (wanted.has(s) && cfg.socialLinks[s]) lines.push(`${cap(s)}: ${cfg.socialLinks[s]}`);
  }
  if (!opts.resumeAttached && cfg.resumeUrl && demandsResume(postText)) {
    lines.push(`Resume: ${cfg.resumeUrl}`);
  }
  // compliance: a clear opt-out is legally required even for cold email, but phrased
  // naturally (they never "subscribed"). Sender ID = name+email above. Postal address optional.
  const optOut = `Not the right time? Just reply "no" and I won't follow up.`;
  lines.push(cfg.postalAddress ? `${cfg.postalAddress} · ${optOut}` : optOut);
  return lines.join("\n");
}

/** Decide which files to attach for this lead (only when the post explicitly asks).
 *  NOTE: in draft mode attachments cannot ride along compose links — the dashboard warns
 *  the user to attach manually in Gmail. */
export function attachmentsFor(cfg: OutreachConfig, postText: string): { resume: boolean; coverLetter: boolean } {
  if (!cfg.attachWhenDemanded) return { resume: false, coverLetter: false };
  return { resume: demandsResume(postText), coverLetter: demandsCoverLetter(postText) };
}
