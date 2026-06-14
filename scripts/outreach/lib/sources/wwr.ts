/** We Work Remotely — proven live (52 items). RSS; title is usually "Company: Role". */
import type { RawLead } from "../types";
import { getText, decodeHtml, detectStack } from "./http";

const FEEDS = [
  "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss",
  // zero overlap with the two feeds above (verified live) — Node/API roles land here
  "https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss",
];

function tag(item: string, name: string): string {
  const m = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decodeHtml(m[1].replace(/<!\[CDATA\[|\]\]>/g, "")) : "";
}

export async function fetchWWR(): Promise<RawLead[]> {
  const out: RawLead[] = [];
  for (const feed of FEEDS) {
    let xml = "";
    try { xml = await getText(feed, "application/rss+xml"); } catch { continue; }
    const items = xml.split(/<item>/).slice(1).map((s) => s.split("</item>")[0]);
    for (const it of items) {
      const title = tag(it, "title");
      const [companyRaw, ...roleParts] = title.split(/:|—|–/);
      const company = (companyRaw || title).trim().slice(0, 80);
      const role = roleParts.join(" ").trim() || title;
      const region = tag(it, "region") || tag(it, "category");
      const signal = `${role} — ${region}`.trim();
      const pubDate = tag(it, "pubDate");
      const description = tag(it, "description");
      out.push({
        company,
        segment: "hiring_signal",
        source: "wwr",
        sourceUrl: tag(it, "link") || null,
        signal: signal.slice(0, 240),
        signalRaw: { title, region },
        postedAt: pubDate && !Number.isNaN(Date.parse(pubDate)) ? new Date(pubDate).toISOString() : null,
        description: description ? description.slice(0, 2500) : null,
        stack: detectStack(`${title} ${description}`),
        country: region || null,
      });
    }
  }
  return out;
}
