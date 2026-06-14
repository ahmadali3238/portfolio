/** JD-compliance harness: runs the real personalize (p2) pipeline against adversarial
 *  job-description scenarios and emits JSON for independent judging.
 *  Run: tsx scripts/outreach/poc/jdtest.ts */
import { config as l } from "dotenv"; l({ path: ".env.local" }); l();
import { loadConfig } from "../lib/config";
import { personalize } from "../lib/personalize";

const SCENARIOS = [
  { key: "github-ask", company: "Driftlock", signal: "Driftlock | Full-Stack Engineer | Remote (US)",
    description: "Driftlock builds anomaly-detection software for fintech compliance teams. Series A, 14 people. Stack: TypeScript, React, Node, Postgres. We move fast and ship weekly. We want someone who has built real production systems with LLM integrations.\n\nTo apply: email us a short intro and include a link to your GitHub and anything you've shipped that you're proud of." },
  { key: "formal-enterprise", company: "Meridian Health Systems", signal: "Meridian Health Systems | Senior Software Engineer | Remote",
    description: "Meridian Health Systems (1,200 employees) is a leading provider of clinical workflow software for hospital networks. We are seeking a Senior Software Engineer to join our Platform Modernization initiative. Responsibilities include designing scalable microservices, mentoring junior engineers, and collaborating with product management. Requirements: 3+ years professional experience, proficiency in React and Node.js, experience with HIPAA-regulated environments preferred. We offer comprehensive benefits. Please submit a resume and cover letter describing your interest in healthcare technology." },
  { key: "casual-founder", company: "Beanstalk", signal: "Beanstalk | founding engineer | remote anywhere",
    description: "hey! we're 3 people building beanstalk — think 'duolingo for personal finance'. react native + supabase + openai. no suits, no jira theater, just shipping. tell us the coolest thing you've ever built (doesn't have to be code). we reply to every email, promise." },
  { key: "special-instruction", company: "Vector Labs", signal: "Vector Labs | Full-Stack + AI Engineer | Remote",
    description: "Vector Labs builds embeddings infrastructure for search teams. Python/FastAPI + React/TypeScript. We're hiring a contractor-to-hire full-stack engineer with RAG experience.\n\nIMPORTANT: so we know you actually read this, put the word 'lighthouse' somewhere in your subject line. Applications without it get auto-archived." },
  { key: "questions-screen", company: "Northwind Robotics", signal: "Northwind Robotics | Software Engineer (Web Dashboard) | Remote EU/US",
    description: "Northwind Robotics makes warehouse robots. We need a web dashboard engineer (React, TypeScript, WebSockets, real-time telemetry). In your email, answer briefly: (1) What's the largest real-time UI you've built? (2) Have you worked with hardware or streaming data before? (3) What's your timezone overlap with CET? Share your LinkedIn too." },
];

(async () => {
  const cfg = loadConfig();
  const results: any[] = [];
  for (const s of SCENARIOS) {
    try {
      const e = await personalize({ company: s.company, signal: s.signal, segment: "hiring_signal", country: "united states", description: s.description }, cfg);
      results.push({ scenario: s.key, jd: s.description, subject: e.subject, body: e.body, analysis: e.analysis, attachments: e.attachments });
    } catch (err) {
      results.push({ scenario: s.key, error: (err as Error).message });
    }
    await new Promise((r) => setTimeout(r, 6000)); // Groq TPM pacing
  }
  console.log(JSON.stringify(results, null, 1));
})();
