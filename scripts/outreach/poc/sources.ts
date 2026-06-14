/**
 * PoC — test every NEW free lead source live (keyless). Reports PASS/FAIL honestly.
 * Run: tsx scripts/outreach/poc/sources.ts
 */
const UA = "Mozilla/5.0 (compatible; JobFinderPoC/1.0; +https://ahmadali3238.vercel.app)";
const T = 20_000;

async function get(url: string, accept = "application/json"): Promise<{ ok: boolean; status: number; body: string }> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: accept }, signal: AbortSignal.timeout(T), redirect: "follow" });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } catch (e: any) {
    return { ok: false, status: 0, body: String(e.message) };
  }
}

async function remoteok() {
  const r = await get("https://remoteok.com/api");
  if (!r.ok) return `FAIL (HTTP ${r.status})`;
  try {
    const arr = JSON.parse(r.body);
    const jobs = arr.filter((x: any) => x.position || x.company);
    const sample = jobs.find((j: any) => /react|next|node|ai|full.?stack/i.test(JSON.stringify(j)));
    return `PASS — ${jobs.length} jobs. e.g. "${sample?.company} — ${sample?.position}" (${sample?.location || "n/a"})`;
  } catch { return `FAIL (not JSON; ${r.body.slice(0, 60)})`; }
}

async function wwr() {
  const r = await get("https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss", "application/rss+xml");
  if (!r.ok) return `FAIL (HTTP ${r.status})`;
  const items = (r.body.match(/<item>/g) || []).length;
  const first = (r.body.match(/<title>([^<]+)<\/title>/g) || [])[1] || "";
  return items ? `PASS — ${items} items. e.g. ${first.replace(/<\/?title>/g, "").slice(0, 70)}` : `FAIL (no <item> in feed)`;
}

async function reddit() {
  const r = await get("https://www.reddit.com/r/forhire/new.json?limit=50");
  if (!r.ok) return `FAIL (HTTP ${r.status})`;
  try {
    const d = JSON.parse(r.body);
    const posts = d.data.children.map((c: any) => c.data);
    const hiring = posts.filter((p: any) => /\[hiring\]/i.test(p.title));
    return `PASS — ${posts.length} posts, ${hiring.length} [Hiring]. e.g. "${hiring[0]?.title?.slice(0, 70) || "—"}"`;
  } catch { return `FAIL (not JSON)`; }
}

async function yc() {
  // Community-maintained static export of all YC companies (free, no key).
  const r = await get("https://yc-oss.github.io/api/companies/all.json");
  if (!r.ok) return `FAIL (HTTP ${r.status})`;
  try {
    const arr = JSON.parse(r.body);
    const ai = arr.filter((c: any) => /ai|ml|llm|agent/i.test((c.one_liner || "") + (c.tags || []).join(" ")));
    return `PASS — ${arr.length} companies, ${ai.length} AI-tagged. e.g. ${arr[0]?.name} (${arr[0]?.website || "n/a"})`;
  } catch { return `FAIL (not JSON)`; }
}

async function wellfound() {
  const r = await get("https://wellfound.com/role/r/full-stack-engineer", "text/html");
  return r.ok ? `PASS-ish (HTTP 200, HTML ${r.body.length}b — needs scraping/JS, brittle)` : `FAIL (HTTP ${r.status} — Cloudflare/blocked, expected)`;
}

async function indiehackers() {
  const r = await get("https://www.indiehackers.com/", "text/html");
  return r.ok ? `PARTIAL (HTTP 200 — no clean API; would need scraping)` : `FAIL (HTTP ${r.status})`;
}

async function main() {
  const tests: [string, () => Promise<string>][] = [
    ["RemoteOK   ", remoteok], ["WeWorkRemote", wwr], ["Reddit forhire", reddit],
    ["YC directory", yc], ["Wellfound  ", wellfound], ["IndieHackers", indiehackers],
  ];
  for (const [name, fn] of tests) {
    const res = await fn().catch((e) => `FAIL (${e.message})`);
    console.log(`${name}: ${res}`);
  }
}
main();

export {};
