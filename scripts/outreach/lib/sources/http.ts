import { matchedKeywords } from "../text";

export const UA = "Mozilla/5.0 (compatible; JobFinder/1.0; +https://ahmadali3238.vercel.app)";
const T = 20_000;

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(T) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}

export async function getText(url: string, accept = "text/html"): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: accept }, signal: AbortSignal.timeout(T) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

export function decodeHtml(input: string): string {
  // entities FIRST, tags second — WWR ships entity-encoded markup (&lt;li&gt;…), and
  // stripping tags before decoding left that markup in every WWR description
  return (input || "")
    .replace(/&#x2F;/g, "/").replace(/&#x27;/g, "'").replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&nbsp;/g, " ")
    .replace(/<\/p>/gi, "\n").replace(/<p>/gi, "\n").replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ").replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();
}

export function firstEmail(text: string): string | null {
  return (text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i) || [null])[0];
}

// no bare "next": word-bounded it still matches "next week" — next.js/nextjs cover the tech
const STACK_KEYWORDS = ["react", "reactjs", "next.js", "nextjs", "node", "node.js", "typescript",
  "javascript", "full stack", "fullstack", "frontend", "ai", "llm", "agent",
  "agentic", "rag", "openai", "claude", "anthropic", "gemini", "langchain", "python", "fastapi",
  "supabase", "postgres", "tailwind", "react native", "stripe", "automation", "chatbot"];

export function detectStack(text: string): string[] {
  return matchedKeywords(text, STACK_KEYWORDS);
}
