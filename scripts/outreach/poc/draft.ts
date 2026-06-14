/**
 * PoC #2 — Personalized email generation (Claude paid OR Groq/Gemini free).
 * Goal: prove the LLM writes a unique, specific cold email from a real lead's signal
 * + Abdullah's profile — not a template — and returns clean { subject, body } JSON.
 *
 * Run: pnpm outreach:poc:claude
 * Requires ONE of: ANTHROPIC_API_KEY (default) or GROQ_API_KEY (free).
 * Provider: OUTREACH_LLM_PROVIDER=anthropic|groq  (auto-detects if unset).
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

// ── Abdullah's pitch (condensed from the portfolio) ────────────────────────────
const PROFILE = `
Ahmad Ali — Full-Stack + AI/Agentic Workflows engineer (Lahore, remote).
Sells: Next.js/React/Node/TypeScript apps, AI features & agents (Claude/OpenAI/Gemini,
LangGraph, MCP, RAG), payments/auth/video integrations, real-time dashboards, React Native.
Proof projects (pick the most relevant for the lead):
- Navero — AI hiring OS (multi-provider LLM orchestration, per-job cost tracking; 104 DB models, 276 API routes).
- Creator AI — enterprise product-innovation platform for F&B (RAG, synthetic-persona validation, image gen).
- Reply Intelligence — cold-outbound lead-ops (classifies 17k+ replies with Claude at ~$0.20/1k).
- Fatherform — AI parenting platform (337 API endpoints, RAG, voice/video).
Tone: friendly, plain, specific, no fluff. Upwork 100% JSS, Anthropic-certified.
`.trim();

// ── A REAL lead from the live HN PoC run ───────────────────────────────────────
const SAMPLE_LEAD = {
  company: "Kanary",
  role: "Full Stack Engineer (Python / React)",
  signal: "Hiring a remote (US) full-stack engineer; stack mentions React, Python, AI, LLM, agentic, OpenAI, Anthropic, automation.",
  segment: "hiring_signal",
  country: "United States",
};

const COMPLIANCE_FOOTER =
  "\n\n—\nAhmad Ali · Full-Stack & AI Engineer · ahmadalibusiness3238@gmail.com\n" +
  "[Your postal address here] · Reply \"unsubscribe\" and I won't email again.";

function buildPrompt() {
  return `You are writing a SHORT cold email for Ahmad Ali to a prospect.

ABDULLAH'S PROFILE:
${PROFILE}

THE LEAD:
- Company: ${SAMPLE_LEAD.company}
- Context: ${SAMPLE_LEAD.role}
- Signal: ${SAMPLE_LEAD.signal}
- Segment: ${SAMPLE_LEAD.segment} (they are actively hiring)
- Country: ${SAMPLE_LEAD.country}

RULES:
- 90-130 words, plain text, no markdown.
- Reference THEIR specific need, then cite the ONE most relevant proof project.
- One low-friction CTA (a quick chat / async look at their stack).
- Sound human and specific. NO generic templated lines like "I hope this finds you well".
- Do NOT include a signature/footer (added separately).
- Return ONLY valid JSON: {"subject": "...", "body": "..."} and nothing else.`;
}

async function callAnthropic(prompt: string) {
  const key = process.env.ANTHROPIC_API_KEY!;
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      system: "You output only valid JSON. No prose.",
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const json: any = await res.json();
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${JSON.stringify(json)}`);
  return { text: json.content?.[0]?.text ?? "", model, usage: json.usage };
}

async function callGroq(prompt: string) {
  const key = process.env.GROQ_API_KEY!;
  const model = process.env.OUTREACH_LLM_MODEL || "llama-3.3-70b-versatile";
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You output only valid JSON. No prose." },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const json: any = await res.json();
  if (!res.ok) throw new Error(`Groq ${res.status}: ${JSON.stringify(json)}`);
  return { text: json.choices?.[0]?.message?.content ?? "", model, usage: json.usage };
}

function pickProvider(): "anthropic" | "groq" {
  const forced = (process.env.OUTREACH_LLM_PROVIDER || "").toLowerCase();
  if (forced === "anthropic" || forced === "groq") return forced;
  // Free-first: prefer Groq (free tier); Claude only if explicitly the only key present.
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  throw new Error("Set GROQ_API_KEY (free) in .env.local — or ANTHROPIC_API_KEY if you opt into paid");
}

async function main() {
  const provider = pickProvider();
  console.log(`→ Generating a personalized email for "${SAMPLE_LEAD.company}" via ${provider}…\n`);

  const prompt = buildPrompt();
  const { text, model, usage } = provider === "anthropic"
    ? await callAnthropic(prompt)
    : await callGroq(prompt);

  let parsed: { subject: string; body: string };
  try {
    parsed = JSON.parse(text.trim().replace(/^```json\s*|\s*```$/g, ""));
  } catch {
    throw new Error(`Model did not return valid JSON. Raw:\n${text}`);
  }

  console.log("─".repeat(64));
  console.log(`MODEL:   ${model}`);
  console.log(`SUBJECT: ${parsed.subject}`);
  console.log("─".repeat(64));
  console.log(parsed.body + COMPLIANCE_FOOTER);
  console.log("─".repeat(64));
  if (usage) console.log(`tokens:  ${JSON.stringify(usage)}`);
  console.log("\n✓ Personalization works. Each lead gets a unique email built from its own signal.");
}

main().catch((err) => {
  console.error("\n✗ Claude/LLM PoC failed:", err.message);
  process.exit(1);
});
