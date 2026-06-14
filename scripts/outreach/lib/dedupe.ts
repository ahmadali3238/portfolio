/** Stable dedupe key from company (+ person) so re-runs never insert duplicates. */
import { createHash } from "node:crypto";

function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|co|gmbh|the|technologies|labs|software|app)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export function dedupeKey(company: string, person?: string | null): string {
  const base = `${norm(company)}|${norm(person || "")}`;
  return createHash("sha1").update(base).digest("hex").slice(0, 24);
}

/** Cheap similarity for the anti-duplicate-draft guard (Jaccard over word shingles). */
export function similarity(a: string, b: string): number {
  const toks = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter(Boolean));
  const A = toks(a), B = toks(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}
