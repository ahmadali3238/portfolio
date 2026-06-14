/** HN "Who is Hiring" — proven live (299 ICP leads). Ported from poc/hn.ts.
 *  No cursor: the whole monthly thread is already fetched in one call, every post in it
 *  is ≤1 month old, and dedupe makes re-processing free — so we parse ALL of it nightly
 *  (new posts are appended through the month and get picked up same-night). */
import type { RawLead } from "../types";
import type { SourceResult } from "./index";
import { getJson, decodeHtml, firstEmail, detectStack } from "./http";

const ALGOLIA = "https://hn.algolia.com/api/v1";
const HARD_CAP = 1000; // safety bound; threads run ~300 posts

/** Job-seeker posts (the "Who wants to be hired?" template) regularly get posted into the
 *  hiring thread by mistake — they're candidates, not clients. Template fields
 *  ("Willing to relocate:", "Résumé/CV:") and first-person availability language identify
 *  them reliably; employer posts never contain these. */
// template fields require the trailing ":" — employers legitimately write "send your
// resume/CV to jobs@…" and "must be willing to relocate." in prose (verified live)
const SEEKER = /\b(?:seeking work|willing to relocate\s*:|r[ée]sum[ée]\s*\/?\s*cv\s*:|resume\s*\/?\s*cv\s*:|cv\s*\/\s*r[ée]sum[ée]\s*:|(?:i'?m|i am)(?: currently| actively)? (?:looking|searching) for [^.!?\n]{0,60}?(?:jobs?\b|roles\b|positions\b|opportunities\b)|open to (?:new )?(?:roles|positions|opportunities|work\b))/i;

export function isSeekerPost(text: string): boolean {
  return SEEKER.test(text || "");
}

export async function fetchHN(_cursor: Record<string, any> | null): Promise<SourceResult> {
  const search = await getJson<{ hits: { objectID: string; title: string }[] }>(
    `${ALGOLIA}/search_by_date?tags=story,author_whoishiring&hitsPerPage=20`);
  const story = search.hits.find((h) => /who is hiring/i.test(h.title || ""));
  if (!story) return { leads: [] };

  const item = await getJson<{ children: { text: string | null; id: number; created_at?: string }[] }>(`${ALGOLIA}/items/${story.objectID}`);
  const comments = (item.children || []).filter((c) => c?.text && c.text.trim().length > 40).slice(0, HARD_CAP);

  const leads = comments.flatMap((c): RawLead[] => {
    const text = decodeHtml(c.text as string);
    if (isSeekerPost(text)) return []; // a candidate advertising themselves, not a client
    const firstLine = text.split("\n")[0].trim();
    const parts = firstLine.split("|").map((p) => p.trim()).filter(Boolean);
    return [{
      company: (parts[0] || "(unknown)").slice(0, 80),
      segment: "hiring_signal",
      source: "hn",
      sourceUrl: `https://news.ycombinator.com/item?id=${c.id}`,
      signal: firstLine.slice(0, 240),
      signalRaw: {},
      postedAt: c.created_at || null,
      description: text.slice(0, 2500),
      email: firstEmail(text),
      stack: detectStack(text),
      country: null, // inferred later from signal text
    }];
  });

  return { leads };
}
