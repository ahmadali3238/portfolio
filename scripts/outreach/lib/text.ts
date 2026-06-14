/** Word-boundary keyword matching. The old `.includes("ai")` matched "email"/"available"/
 *  "maintain"/"Ukraine", so nearly every posting passed the relevance gate and scored as
 *  AI-relevant. A keyword now hits only as a whole token (no letter/digit on either side):
 *  "AI", "AI/ML" and "ai-powered" match; "maintain" doesn't. Trailing "s" is allowed so
 *  "agents"/"LLMs" still count, and internal spaces match hyphens ("full stack" ⇢ "full-stack"). */

const cache = new Map<string, RegExp>();

export function keywordRegex(keyword: string): RegExp {
  let re = cache.get(keyword);
  if (!re) {
    const escaped = keyword
      .toLowerCase()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\s+/g, "[\\s-]+");
    re = new RegExp(`(?<![a-z0-9])${escaped}s?(?![a-z0-9])`, "i");
    cache.set(keyword, re);
  }
  return re;
}

export function hasKeyword(text: string, keyword: string): boolean {
  return keywordRegex(keyword).test(text || "");
}

export function matchedKeywords(text: string, keywords: string[]): string[] {
  const t = text || "";
  return keywords.filter((k) => hasKeyword(t, k));
}
