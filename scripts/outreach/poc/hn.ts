/**
 * PoC #1 — HN "Who is Hiring" sourcing (KEYLESS, free).
 * Goal: prove we can fetch the latest monthly thread, parse real job posts into
 * structured leads (company / role / location / remote / email / stack), and score
 * them against Ahmad Ali's services.
 *
 * Run: pnpm outreach:poc:hn   (or: tsx scripts/outreach/poc/hn.ts)
 * No API key required.
 */

const ALGOLIA = "https://hn.algolia.com/api/v1";
const UA = "Mozilla/5.0 (compatible; JobFinderPoC/1.0; +https://ahmadali3238.vercel.app)";
const TIMEOUT_MS = 20_000;

// Services Abdullah sells — used for keyword relevance scoring.
const SERVICE_KEYWORDS = [
  "react", "next.js", "nextjs", "next", "node", "node.js", "typescript", "javascript",
  "full stack", "full-stack", "fullstack", "frontend", "front-end", "front end",
  "ai", "a.i.", "llm", "agent", "agentic", "rag", "openai", "claude", "anthropic",
  "gemini", "langchain", "python", "fastapi", "supabase", "postgres", "tailwind",
  "react native", "stripe", "automation", "chatbot",
];

// Geo signals (very rough; the real build infers this properly).
const TARGET_HINTS = ["remote", "us", "usa", "united states", "uk", "canada", "australia",
  "uae", "dubai", "netherlands", "amsterdam", "ireland", "london", "new york", "sf",
  "san francisco", "berlin", "europe", "anywhere", "worldwide"];
const EXCLUDE_HINTS = ["india", "pakistan", "bangladesh", "nigeria", "philippines",
  "vietnam", "indonesia", "egypt", "bangalore", "lahore", "dhaka", "manila"];

interface RawLead {
  company: string;
  role: string;
  location: string;
  remote: boolean;
  email: string | null;
  urls: string[];
  stack: string[];
  score: number;
  geoFlag: "target" | "excluded" | "unknown";
  hnUrl: string;
  preview: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}

function decodeHtml(input: string): string {
  return input
    .replace(/<\/p>/gi, "\n")
    .replace(/<p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x2F;/g, "/")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

async function getLatestWhoIsHiringStory(): Promise<{ id: number; title: string }> {
  // The "whoishiring" bot posts the monthly thread. Grab the newest one titled "Who is hiring?".
  const data = await fetchJson<{ hits: { objectID: string; title: string }[] }>(
    `${ALGOLIA}/search_by_date?tags=story,author_whoishiring&hitsPerPage=20`,
  );
  const hit = data.hits.find((h) => /who is hiring/i.test(h.title || ""));
  if (!hit) throw new Error("Could not find a recent 'Who is hiring?' thread.");
  return { id: Number(hit.objectID), title: hit.title };
}

async function getTopLevelComments(storyId: number): Promise<{ text: string; id: number }[]> {
  const item = await fetchJson<{ children: { text: string | null; id: number }[] }>(
    `${ALGOLIA}/items/${storyId}`,
  );
  return (item.children || [])
    .filter((c) => c && typeof c.text === "string" && c.text.trim().length > 40)
    .map((c) => ({ text: c.text as string, id: c.id }));
}

function parseLead(commentText: string, commentId: number): RawLead {
  const text = decodeHtml(commentText);
  const firstLine = text.split("\n")[0].trim();

  // HN convention: "Company | Role | Location | REMOTE | stack..."
  const parts = firstLine.split("|").map((p) => p.trim()).filter(Boolean);
  const company = parts[0]?.slice(0, 80) || "(unknown)";
  const role = parts.slice(1, 3).join(" — ").slice(0, 120) || "(see post)";

  const lower = text.toLowerCase();
  const remote = /\bremote\b/i.test(text);

  const email = (text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i) || [null])[0];
  const urls = Array.from(
    new Set((text.match(/https?:\/\/[^\s)<>"]+/gi) || []).map((u) => u.replace(/[.,]$/, ""))),
  ).slice(0, 3);

  const stack = SERVICE_KEYWORDS.filter((k) => lower.includes(k));

  let geoFlag: RawLead["geoFlag"] = "unknown";
  if (EXCLUDE_HINTS.some((h) => lower.includes(h))) geoFlag = "excluded";
  else if (TARGET_HINTS.some((h) => lower.includes(h))) geoFlag = "target";

  // crude score: stack matches (max 50) + remote (15) + has email (20) + geo (±15)
  let score = Math.min(stack.length * 10, 50);
  if (remote) score += 15;
  if (email) score += 20;
  if (geoFlag === "target") score += 15;
  if (geoFlag === "excluded") score -= 40;
  score = Math.max(0, Math.min(100, score));

  return {
    company, role, location: parts.find((p) => /remote|usa?|uk|europe|anywhere|\b[A-Z]{2}\b/i.test(p)) || "(see post)",
    remote, email, urls, stack, score, geoFlag,
    hnUrl: `https://news.ycombinator.com/item?id=${commentId}`,
    preview: firstLine.slice(0, 140),
  };
}

async function main() {
  console.log("→ Finding the latest HN 'Who is Hiring' thread…");
  const story = await getLatestWhoIsHiringStory();
  console.log(`  Found: "${story.title}" (id ${story.id})\n`);

  console.log("→ Fetching job postings…");
  const comments = await getTopLevelComments(story.id);
  console.log(`  ${comments.length} top-level postings found.\n`);

  const leads = comments
    .map((c) => parseLead(c.text, c.id))
    .filter((l) => l.score > 0 && l.geoFlag !== "excluded")
    .sort((a, b) => b.score - a.score);

  const top = leads.slice(0, 5);
  console.log(`→ Top ${top.length} relevant leads (of ${leads.length} scored), excluding weak-currency markets:\n`);

  top.forEach((l, i) => {
    console.log(`${i + 1}. [score ${l.score}] ${l.company}`);
    console.log(`   role:   ${l.role}`);
    console.log(`   remote: ${l.remote ? "yes" : "no"}   geo: ${l.geoFlag}`);
    console.log(`   email:  ${l.email ?? "— (would go to BetterContact)"}`);
    console.log(`   stack:  ${l.stack.join(", ") || "—"}`);
    console.log(`   links:  ${l.urls.join("  ") || "—"}`);
    console.log(`   HN:     ${l.hnUrl}`);
    console.log(`   "${l.preview}"`);
    console.log("");
  });

  const withEmail = leads.filter((l) => l.email).length;
  console.log("─".repeat(64));
  console.log(`SUMMARY: ${comments.length} postings → ${leads.length} relevant → ` +
    `${withEmail} already have an email in-post (free, no BetterContact needed).`);
  console.log(`Free-email coverage this run: ${comments.length ? Math.round((withEmail / leads.length) * 100) : 0}% of relevant leads.`);
}

main().catch((err) => {
  console.error("\n✗ HN PoC failed:", err.message);
  process.exit(1);
});

export {};
