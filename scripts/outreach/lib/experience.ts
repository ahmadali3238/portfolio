/** Experience + seniority gate (§4d) — v2.
 *
 *  v1 ran a bare "N years" regex over the title line only, so it (a) never saw the
 *  description where requirements actually live, and (b) would false-match company-age
 *  phrases ("founded 10 years ago") if pointed at fuller text. v2 scans the FULL posting
 *  but only counts a years-figure when its surrounding context marks it as a requirement,
 *  and adds a title-line seniority gate (staff/principal/director are never a fit; plain
 *  "senior"/"lead" passes only when the stated years fit).
 */

// "5+ years", "3-5 yrs", "4 years of", "6 yoe" — captures lower bound of ranges.
// (?<![\d.]) blocks decimals: "2.5yrs" must not parse the ".5" as 5 years.
const YEAR_PHRASE = /(?<![\d.])(\d{1,2})(?:\s*(?:-|–|—|to)\s*(\d{1,2}))?\s*\+?\s*(yoe\b|years?\b|yrs?\b)/gi;

// company-age / perk / non-requirement contexts immediately around the phrase
const AGE_AFTER = /^\s*(?:ago|old|of (?:operation|history|growth)|in (?:business|operation)|on the market|anniversary|of runway)\b/i;
const AGE_BEFORE = /\b(?:founded|established|started|launched|built|running for|operating for|profitable for|in business(?: for)?|in operation(?: for)?|on the market(?: for)?|been (?:around|building|running)(?: for)?|over the (?:past|last|next)|in the (?:past|last|next)|for the (?:past|last|next)|the next|every|each)\s*(?:the\s+)?$/i;
// "we're a team of 5 with 15+ years of experience" — company self-description, not a requirement
const SELF_DESC_BEFORE = /\b(?:we|we're|we've|our|us|team(?: of \d+)?(?: people)?|founders?)\b[^.!?\n]{0,30}\bwith\s*$/i;

// requirement contexts: nearby requirement words, a role/degree right before the phrase,
// or a tech/role noun right after it ("5+ years React", "Engineer (7+ yrs)", "BS + 7 years")
const REQ_NEARBY = /\b(?:experienced?|exp\b|expertise|yoe|require[sd]?|requirements?|minimum|min\.?|at least|must have|should have|you (?:have|bring|are)|you've|ideal(?:ly)?|looking for|candidates?|applicants?|hands[- ]?on|professional|proficien|background|(?:senior|mid|junior)[- ]level)\b/i;
const ROLE_BEFORE = /\b(?:engineer(?:s|ing)?|developer|dev|swe|sde|programmer|full[- ]?stack|frontend|backend)\b[^.!?\n]{0,40}$/i;
const DEGREE_BEFORE = /\b(?:bs|ba|ms|msc|bsc|phd|bachelor(?:'s)?|master(?:'s)?|degree)\b[^.!?\n]{0,25}$/i;
const TECH_AFTER = /^\s*(?:\+\s*)?(?:of\s+|in\s+|with\s+|using\s+|as\s+(?:an?\s+)?)?(?:react|next|node|typescript|javascript|js\b|python|golang|go\b|java\b|ruby|php|c#|\.net|rust|frontend|front[- ]end|backend|back[- ]end|full[- ]?stack|web|software|mobile|ios|android|devops|sre\b|cloud|infrastructure|distributed|production|saas|quality|qa\b|ml\b|ai\b|llm|data|engineering|development|dev\b|programming|coding|building|shipping)/i;

/** Strictest explicitly-required years in the posting, or null when none is stated.
 *  Ranges count their lower bound ("3-5 years" → 3); multiple requirements take the max
 *  ("5+ years backend, 2+ years React" → 5 — the posting still wants a 5-year engineer). */
export function parseRequiredYears(text: string): number | null {
  const t = (text || "").toLowerCase();
  let best: number | null = null;
  for (const m of t.matchAll(YEAR_PHRASE)) {
    const years = Number(m[1]);
    if (!Number.isFinite(years) || years === 0 || years > 20) continue;
    const start = m.index ?? 0;
    // clip context windows at sentence boundaries — "we're 10 years in. At least 3 years…"
    // must not let the next sentence's "at least" qualify the company-age figure
    const before = (t.slice(Math.max(0, start - 50), start).split(/[.!?\n]/).pop() || "");
    const after = (t.slice(start + m[0].length, start + m[0].length + 50).split(/[!?\n]/)[0] || "")
      .split(/\.(?=\s|$)/)[0]; // "." only ends a sentence before whitespace — keep "node.js"
    if (AGE_AFTER.test(after) || AGE_BEFORE.test(before) || SELF_DESC_BEFORE.test(before)) continue;
    const isRequirement = /yoe/i.test(m[3]) || TECH_AFTER.test(after)
      || ROLE_BEFORE.test(before) || DEGREE_BEFORE.test(before)
      || REQ_NEARBY.test(`${before} ${after}`);
    if (!isRequirement) continue;
    best = best === null ? years : Math.max(best, years);
  }
  return best;
}

export type Seniority = "hard" | "soft" | null;

// Checked against the TITLE LINE only — body text says things like "you'll work with our
// VP of Engineering" without the role itself being senior.
const HARD_SENIOR = /\b(?:staff|principal|distinguished|director|vp|vice president|cto|chief \w+ officer|head of \w+|(?:solutions?|software|cloud|enterprise|platform|security) architect|engineering manager)\b/i;
const SOFT_SENIOR = /\b(?:senior|snr|sr\.?|lead (?:engineer|developer|dev|swe|software|frontend|backend|full[- ]?stack)|(?:tech|team|technical) lead)\b/i;

// measured FP classes (live audit): "Member of Technical Staff" is an IC title, not
// staff-level; posts that also welcome junior/mid/all-levels still have a reachable role
const MTS_TITLE = /member of technical staff/gi;
const MIXED_LEVEL = /\b(?:juniors?|jr\.?|mid[- ]level|mid & senior|all levels|entry[- ]level|interns?(?: welcome)?|graduates?)\b/i;

/** Seniority of the role per its title line. */
export function assessSeniority(titleLine: string): Seniority {
  const t = (titleLine || "").replace(MTS_TITLE, "MTS");
  if (MIXED_LEVEL.test(t)) return null;
  if (HARD_SENIOR.test(t)) return "hard";
  if (SOFT_SENIOR.test(t)) return "soft";
  return null;
}

export interface ExperienceVerdict {
  ok: boolean;
  requiredYears: number | null;
  seniority: Seniority;
  reason: string | null; // audit-trail status_reason when !ok
}

/** Full experience/seniority verdict for a lead.
 *  - hard senior title → never pursue
 *  - stated requirement above myYears → never pursue
 *  - soft senior title with NO stated years → pursue only if !skipUnnumberedSenior
 *  - otherwise fail-open (no number stated is the common case) */
export function assessExperience(opts: {
  titleLine: string;
  fullText: string;
  myYears: number;
  skipUnnumberedSenior: boolean;
}): ExperienceVerdict {
  const requiredYears = parseRequiredYears(opts.fullText);
  const seniority = assessSeniority(opts.titleLine);

  if (seniority === "hard")
    return { ok: false, requiredYears, seniority, reason: "senior_title:hard" };
  if (requiredYears !== null && requiredYears > opts.myYears)
    return { ok: false, requiredYears, seniority, reason: `requires:${requiredYears}y > yours:${opts.myYears}y` };
  if (seniority === "soft" && requiredYears === null && opts.skipUnnumberedSenior)
    return { ok: false, requiredYears, seniority, reason: "senior_title:unnumbered" };
  return { ok: true, requiredYears, seniority, reason: null };
}

/** Back-compat wrapper (v1 signature). Prefer assessExperience for new code. */
export function qualifiesByExperience(text: string, myYears: number, skipUnnumberedSenior: boolean): boolean {
  return assessExperience({ titleLine: text, fullText: text, myYears, skipUnnumberedSenior }).ok;
}
