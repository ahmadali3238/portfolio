/**
 * PoC — test the pure-logic claims: experience/seniority gate (§4d), word-boundary keyword
 * matching, and email-content detection (§5a). No network/keys.
 * v2: imports the REAL lib modules (the old version asserted against an inline copy).
 * Run: tsx scripts/outreach/poc/qualify.ts
 */
import { parseRequiredYears, assessExperience, assessSeniority } from "../lib/experience";
import { hasKeyword } from "../lib/text";
import { isSeekerPost } from "../lib/sources/hn";
import { toWaPhone } from "../lib/sources/osm";

// ── §5a: content demands (mirrors lib/email-content.ts heuristics) ──
const demandsResume = (t: string) => /\b(resume|cv|c\.v\.)\b/i.test(t);
const demandsCoverLetter = (t: string) => /cover letter/i.test(t);
function requestedSocials(t: string): string[] {
  const out: string[] = [];
  if (/\bgithub\b/i.test(t)) out.push("github");
  if (/\blinkedin\b/i.test(t)) out.push("linkedin");
  if (/\bupwork\b/i.test(t)) out.push("upwork");
  if (/\byoutube\b/i.test(t)) out.push("youtube");
  if (/\bportfolio\b/i.test(t)) out.push("portfolio");
  return out;
}

// ── assertions ──
const MY = 3;
let pass = 0, fail = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "✓" : "✗"} ${name} → got ${JSON.stringify(got)}${ok ? "" : ` (want ${JSON.stringify(want)})`}`);
  ok ? pass++ : fail++;
}
const fits = (text: string, strict = true) =>
  assessExperience({ titleLine: text, fullText: text, myYears: MY, skipUnnumberedSenior: strict }).ok;

console.log("— Experience gate (your years = 3) —");
check("'5+ years React' → skip", fits("Engineer with 5+ years of React"), false);
check("'2-4 years' → include", fits("Full-stack dev, 2-4 years experience"), true);
check("no experience stated → include", fits("Full Stack Engineer | Remote (US)"), true);
check("'minimum 4 years' → skip", fits("Minimum 4 years of experience required"), false);
check("'3+ years' → include (==3)", fits("3+ years of Node.js"), true);
check("'7+ YOE' → skip", fits("Full-stack role, 7+ YOE"), false);
check("'1 year of React' → include", fits("1 year of React experience"), true);
check("multi-skill takes max: '5+ yrs backend, 2+ yrs React' → skip", fits("5+ years backend, 2+ years React"), false);

console.log("\n— Company-age phrases are NOT requirements —");
check("'founded 10 years ago' → null", parseRequiredYears("Founded 10 years ago, we build fintech APIs in React"), null);
check("'in business for 12 years' → null", parseRequiredYears("We have been in business for 12 years. Looking for a React engineer"), null);
check("'over the past 5 years' → null", parseRequiredYears("Over the past 5 years we grew to 40 people; hiring Node devs"), null);
check("'established 8 years' company + real req picked up", parseRequiredYears("Established 8 years ago. Requirements: 4+ years of TypeScript experience"), 4);

console.log("\n— Live-audit leak classes (hand-labeled June 2026) —");
check("Akamai: '8+ years of experience and a bachelor's degree' → skip", fits("Web developer role. Have 8+ years of experience and a bachelor's degree in computer science"), false);
check("MWI: '7+ years of professional full-stack…' → skip", fits("7+ years of professional full-stack software engineering experience"), false);
check("Obsidian: '~8+ yrs experience' → skip", fits("Looking for ~8+ yrs experience, real browser knowledge"), false);
check("role-title-before: 'Engineer (7+ yrs)' → skip", fits("Full-Stack Engineer (7+ yrs) — fintech"), false);
check("role-title-before: 'SWE ($150k): 5+ years' → skip", fits("SWE ($150k): 5+ years building web apps"), false);
check("degree-before: 'MS + 5 yrs or BS + 7 yrs' → skip", fits("MS + 5 yrs or BS + 7 yrs"), false);
check("Everflow: \"we're 10 years in\" + real 3y req → include", fits("We're 10 years in, profitable, no outside funding. At least 3 years of experience required"), true);
check("Clad: '5 years of runway' → null", parseRequiredYears("Raised $2.7m, have 5 years of runway, and are growing"), null);
check("YNAB: 'for over 20 years' → null", parseRequiredYears("For over 20 years, YNAB has been changing lives"), null);
check("Vultr: 'sabbatical every 5 years' → null", parseRequiredYears("1 month paid sabbatical every 5 years + anniversary bonus"), null);
check("Foam: decimal '2.5yrs' → null", parseRequiredYears("Berkeley EECS (2.5yrs w/3.98 GPA)"), null);
check("Coop: 'team of 5 with 15+ years of experience' → null", parseRequiredYears("We're a tight-knit team of 5 people with 15+ years of experience working together"), null);
check("'the next 5 years' growth talk → null", parseRequiredYears("Our plan for the next 5 years is ambitious. Hiring React devs"), null);

console.log("\n— Seniority gate (title line) —");
check("'Staff Engineer' → hard", assessSeniority("Acme | Staff Engineer | Remote"), "hard");
check("'Principal Engineer, 2+ yrs' → skip (hard beats years)", fits("Principal Engineer, 2+ years experience"), false);
check("'Head of Engineering' → skip", fits("Head of Engineering — remote"), false);
check("'Engineering Manager' → skip", fits("Engineering Manager (Platform)"), false);
check("'Software Architect' → skip", fits("Software Architect, worldwide"), false);
check("'Senior' no number, strict → skip", fits("Senior Engineer, remote", true), false);
check("'Senior' no number, lax → include", fits("Senior Engineer, remote", false), true);
check("'Senior, 3+ years' → include (years fit)", fits("Senior Developer — 3+ years experience ok"), true);
check("'Tech Lead' no number, strict → skip", fits("Tech Lead — fintech, remote", true), false);
check("'Lead generation platform' ≠ senior title", assessSeniority("Lead generation platform hiring React dev"), null);
check("'Member of Technical Staff' ≠ staff-level", assessSeniority("Composio | Member of Technical Staff - Product Eng"), null);
check("'Lead SWE' → soft", assessSeniority("CivTiq | Lead SWE | Toronto"), "soft");
check("junior-friendly post not skipped", assessSeniority("Lead Software Engineer — strong Juniors also welcome"), null);
check("'Mid & Senior' mixed post not skipped", assessSeniority("Mid & Senior Engineers | Remote"), null);
check("body VP mention doesn't poison non-senior title",
  assessExperience({ titleLine: "Full Stack Developer", fullText: "Full Stack Developer. You will work closely with our VP of Engineering.", myYears: MY, skipUnnumberedSenior: true }).ok,
  true);

console.log("\n— Word-boundary keyword matching —");
check("'ai' ∉ 'email'", hasKeyword("Send your email to apply", "ai"), false);
check("'ai' ∉ 'available'/'maintain'", hasKeyword("available to maintain dashboards", "ai"), false);
check("'ai' ∈ 'AI/ML engineer'", hasKeyword("AI/ML engineer wanted", "ai"), true);
check("'ai' ∈ 'ai-powered'", hasKeyword("ai-powered analytics", "ai"), true);
check("'agent' ∈ 'agents' (plural)", hasKeyword("we build AI agents for finance", "agent"), true);
check("'next.js' ∈ 'Next.js dev'", hasKeyword("Next.js developer", "next.js"), true);
check("'next.js' ∉ 'what's next'", hasKeyword("what's next for the team", "next.js"), false);
check("'full stack' ∈ 'full-stack' (hyphen)", hasKeyword("full-stack engineer", "full stack"), true);
check("'node' ∉ 'nodes'? plural allowed by design", hasKeyword("graph nodes", "node"), true);

console.log("\n— Job-seeker post detection (HN) —");
check("'Who wants to be hired' template → seeker", isSeekerPost(
  "Location: Croatia, Dubrovnik / Europe\nRemote: Yes, remote-first\nWilling to relocate: No, remote preferred\nTechnologies: TypeScript, React, Next.js\nRésumé/CV: https://example.com/Resume.pdf\nEmail: someone@icloud.com"), true);
check("'I'm looking for remote roles' → seeker", isSeekerPost(
  "Full-Stack Engineer with 3+ years of experience. I'm looking for remote Frontend Engineer, Full-Stack Engineer roles where I can own real product work"), true);
check("'SEEKING WORK' prefix → seeker", isSeekerPost("SEEKING WORK | Remote | Full-stack dev available"), true);
check("'open to opportunities' → seeker", isSeekerPost("Senior dev, open to new opportunities, ping me"), true);
check("employer post ≠ seeker", isSeekerPost(
  "Acme (acme.com) | Full-Stack Engineer | Remote (US) | Full-time\nWe're building payments infrastructure. Looking for engineers with React/Node experience. Email jobs@acme.com"), false);
check("employer asking FOR resume ≠ seeker", isSeekerPost(
  "Beta Inc | React Developer | Remote\nPlease send your resume and GitHub to careers@beta.dev"), false);
check("employer 'send your resume/CV to' ≠ seeker", isSeekerPost(
  "Gamma | Full-Stack Engineer | Remote (US)\nSend your resume/CV to jobs@gamma.io"), false);
check("employer 'must be willing to relocate.' ≠ seeker", isSeekerPost(
  "Delta | Software Engineer | NYC\nCandidates must be willing to relocate. We sponsor visas."), false);

console.log("\n— Local lane: phone → wa.me normalization —");
check("E.164 with spaces → digits only", toWaPhone("+44 20 3581 8868", "44"), "442035818868");
check("00-intl prefix → stripped", toWaPhone("0044 20 3581 8868", "44"), "442035818868");
check("'00' glued to national '00 020 …' → cc re-added", toWaPhone("00 020 3581 8868", "44"), "442035818868");
check("too-short garbage → null", toWaPhone("+44 123", "44"), null);
check("UK national '020 …' → trunk 0 dropped + cc", toWaPhone("020 3581 8868", "44"), "442035818868");
check("AU national '02 …' → cc 61", toWaPhone("02 9876 5432", "61"), "61298765432");
check("US national 10-digit → cc 1", toWaPhone("(415) 555-0132", "1"), "14155550132");
check("already-intl US '+1 415 …'", toWaPhone("+1 415 555 0132", "1"), "14155550132");
check("empty → null", toWaPhone("", "44"), null);
check("junk with no digits → null", toWaPhone("call us!", "44"), null);

console.log("\n— Email-content detection (§5a) —");
check("demands resume", demandsResume("Please send your resume and a short intro"), true);
check("no resume demand", demandsResume("Email us to apply"), false);
check("demands cover letter", demandsCoverLetter("Include a cover letter explaining your fit"), true);
check("socials requested", requestedSocials("Share your GitHub, LinkedIn and portfolio"), ["github", "linkedin", "portfolio"]);
check("no socials requested", requestedSocials("Apply via email"), []);

console.log(`\n${fail === 0 ? "✓ ALL PASS" : "✗ SOME FAILED"} — ${pass} passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);

export {};
