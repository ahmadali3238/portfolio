/**
 * Ahmad Ali's profile — the source of truth for personalization (job-application cover notes).
 * Each proof engagement carries `match` keywords so the personalizer can auto-select the
 * 1–2 most relevant career engagements for a given job posting.
 *
 * IMPORTANT: these are real CV facts only. Do NOT add invented metrics/percentages/asset
 * counts here — scope and qualitative outcomes only.
 */

export interface ProofProject {
  name: string;
  oneLiner: string;
  url: string | null;  // live URL the email may cite (null = none — never invent one)
  match: string[];     // keywords that make this engagement relevant to a posting
}

export const PROFILE = {
  name: "Ahmad Ali",
  title: "Asset Planning / Fixed Asset & Inventory Specialist (RFID Asset Tracking)",
  location: "Dubai, United Arab Emirates",
  timezone: "Asia/Dubai (UTC+4) — based in the UAE, available for on-site roles across Dubai and the wider Gulf",
  email: "ahmadalibusiness3238@gmail.com",
  years: 7,
  blurb:
    "Asset planning and fixed-asset specialist with 7+ years in the UAE, currently in " +
    "broadcast and live-production asset planning at NEP Middle East. I specialise in " +
    "RFID and barcode fixed-asset tagging, asset registers, physical verification and " +
    "reconciliation, cycle counts, and warehouse/inventory control — having started on the " +
    "warehouse floor as a supervisor and been promoted into asset planning. I keep asset " +
    "registers audit-accurate and inventory operations tight.",
  services: [
    "Fixed-asset management, tagging & asset-register ownership",
    "RFID & barcode asset tracking implementation and rollout",
    "Inventory / stock control, cycle counts & physical verification",
    "Asset reconciliation and audit-ready record keeping",
    "Warehouse supervision (FIFO/FEFO, bin/location discipline, dispatch)",
    "Broadcast & live-production asset planning and deployment",
  ],
};

export const PROOF_PROJECTS: ProofProject[] = [
  {
    name: "RFID fixed-asset tagging & audit — Acube InfoTech",
    url: null,
    oneLiner:
      "led RFID and barcode fixed-asset tagging, registration and reconciliation across " +
      "multiple client sites — establishing repeatable processes that kept asset registers " +
      "audit-accurate and cut physical-verification time versus manual counts",
    match: ["rfid", "barcode", "fixed asset", "asset tagging", "asset tracking", "audit",
      "reconciliation", "physical verification", "asset register", "asset management", "tagging"],
  },
  {
    name: "Broadcast & live-production asset planning — NEP Middle East",
    url: null,
    oneLiner:
      "owns asset planning for high-value, fast-moving broadcast and live-production equipment " +
      "deployed to live events — tracking, scheduling, registering and reconciling assets so " +
      "every unit is accounted for through deployment and return",
    match: ["asset planning", "asset management", "fixed asset", "asset tracking", "broadcast",
      "live production", "equipment", "scheduling", "logistics", "reconciliation", "asset register"],
  },
  {
    name: "Warehouse supervision → promotion to asset planning — NEP Middle East",
    url: null,
    oneLiner:
      "started as warehouse supervisor running stock control, cycle counts and dispatch with " +
      "FIFO/FEFO and bin/location discipline, then was promoted into asset planning after " +
      "consistently keeping inventory accurate and operations reliable",
    match: ["warehouse", "warehouse supervisor", "inventory", "inventory control", "stock control",
      "stock controller", "storekeeper", "cycle count", "stock take", "dispatch", "materials",
      "supply chain", "logistics coordinator"],
  },
];

/** Pick the 1–2 most relevant proof engagements for a posting's signal/description text. */
export function selectProofProjects(signalText: string, max = 2): ProofProject[] {
  const t = (signalText || "").toLowerCase();
  const scored = PROOF_PROJECTS.map((p) => ({
    p,
    score: p.match.reduce((n, k) => (t.includes(k) ? n + 1 : n), 0),
  }));
  const ranked = scored.sort((a, b) => b.score - a.score);
  const hits = ranked.filter((s) => s.score > 0).slice(0, max).map((s) => s.p);
  // always return at least one (default to the RFID fixed-asset engagement — his core specialty)
  return hits.length ? hits : [PROOF_PROJECTS[0]];
}
