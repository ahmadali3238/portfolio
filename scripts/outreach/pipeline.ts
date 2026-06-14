/**
 * Orchestrator — runs the full pipeline in order: source → enrich → draft → send →
 * followup → notify. Each stage is an isolated tsx process and fails SOFT (a broken stage
 * doesn't stop the later, safe stages — notify still runs and reports the failure).
 * BUT the pipeline itself exits non-zero if any stage failed, so the GitHub Actions run
 * goes red and GitHub emails you — a dead pipeline is never silent.
 * Run: pnpm outreach:run
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const STAGES = ["source", "enrich", "draft", "send", "followup", "notify"];
const here = __dirname;

function run(stage: string): boolean {
  console.log(`\n${"━".repeat(60)}\n▶  ${stage.toUpperCase()}\n${"━".repeat(60)}`);
  try {
    execFileSync("npx", ["tsx", join(here, `${stage}.ts`)], { stdio: "inherit", env: process.env });
    return true;
  } catch (e) {
    console.error(`Stage "${stage}" exited non-zero (continuing):`, (e as Error).message);
    return false;
  }
}

const only = process.argv[2]; // optional: run a single stage
const failed = (only ? [only] : STAGES).filter((stage) => !run(stage));

if (failed.length) {
  console.error(`\n✗ Pipeline finished with failed stage(s): ${failed.join(", ")}`);
  process.exit(1);
}
console.log("\n✓ Pipeline complete.");
