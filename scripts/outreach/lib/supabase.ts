/**
 * Supabase REST repository for the outreach_* tables.
 * Copies the blog repository pattern: raw fetch against /rest/v1 with the service-role key,
 * 15s timeout, no SDK. All Supabase access for the worker goes through here.
 */

const SUPABASE_TIMEOUT_MS = 15_000;

function baseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}
function serviceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}
export function hasSupabaseConfig() {
  return Boolean(baseUrl() && serviceKey());
}

async function rest<T>(path: string, init?: RequestInit, query?: URLSearchParams): Promise<T> {
  const url = `${baseUrl()}/rest/v1${path}${query ? `?${query.toString()}` : ""}`;
  if (!hasSupabaseConfig()) throw new Error("Supabase config missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  const res = await fetch(url, {
    ...init,
    headers: {
      apikey: serviceKey(),
      Authorization: `Bearer ${serviceKey()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
    signal: init?.signal ?? AbortSignal.timeout(SUPABASE_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  if (res.status === 204) return null as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (null as T);
}

type Row = Record<string, any>;

// ── Leads ──────────────────────────────────────────────────────────────────
/** Insert leads, skipping any whose dedupe_key already exists. Returns inserted rows. */
export async function insertLeads(leads: Row[]): Promise<Row[]> {
  if (!leads.length) return [];
  const inserted = await rest<Row[]>(
    "/outreach_leads",
    {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify(leads),
    },
    new URLSearchParams({ on_conflict: "dedupe_key" }),
  );
  return inserted || [];
}

export async function getLeads(opts: { status?: string; limit?: number; order?: string } = {}): Promise<Row[]> {
  const q = new URLSearchParams({
    select: "*",
    order: opts.order || "score.desc",
    limit: String(opts.limit ?? 50),
  });
  if (opts.status) q.set("status", `eq.${opts.status}`);
  return (await rest<Row[]>("/outreach_leads", undefined, q)) || [];
}

/** Which of these dedupe keys already exist in the DB? Used to pick the top-N NEW leads —
 *  without this, the nightly top-25 is dominated by already-known high scorers, dedupe
 *  discards them, and the pipeline starves (0 new leads per run). */
export async function getExistingDedupeKeys(keys: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  for (let i = 0; i < keys.length; i += 100) {
    const chunk = keys.slice(i, i + 100);
    const q = new URLSearchParams({ select: "dedupe_key", dedupe_key: `in.(${chunk.join(",")})`, limit: String(chunk.length) });
    const rows = await rest<Row[]>("/outreach_leads", undefined, q).catch(() => [] as Row[]);
    for (const r of rows || []) out.add(r.dedupe_key);
  }
  return out;
}

export async function getLeadsByIds(ids: string[]): Promise<Row[]> {
  if (!ids.length) return [];
  const q = new URLSearchParams({ select: "*", id: `in.(${ids.join(",")})`, limit: String(ids.length) });
  return (await rest<Row[]>("/outreach_leads", undefined, q)) || [];
}

export async function getLeadByEmail(email: string): Promise<Row | null> {
  const q = new URLSearchParams({ select: "*", email: `eq.${email.toLowerCase()}`, limit: "1" });
  const rows = await rest<Row[]>("/outreach_leads", undefined, q);
  return rows?.[0] || null;
}

export async function updateLead(id: string, patch: Row): Promise<void> {
  await rest("/outreach_leads", {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  }, new URLSearchParams({ id: `eq.${id}` }));
}

// ── Messages ───────────────────────────────────────────────────────────────
export async function insertMessage(msg: Row): Promise<Row> {
  const rows = await rest<Row[]>("/outreach_messages", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([msg]),
  });
  return rows?.[0];
}

export async function updateMessage(id: string, patch: Row): Promise<void> {
  await rest("/outreach_messages", {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  }, new URLSearchParams({ id: `eq.${id}` }));
}

export async function getMessages(opts: { leadId?: string; status?: string; limit?: number } = {}): Promise<Row[]> {
  const q = new URLSearchParams({ select: "*", order: "created_at.asc", limit: String(opts.limit ?? 200) });
  if (opts.leadId) q.set("lead_id", `eq.${opts.leadId}`);
  if (opts.status) q.set("status", `eq.${opts.status}`);
  return (await rest<Row[]>("/outreach_messages", undefined, q)) || [];
}

// ── Replies / engagement ─────────────────────────────────────────────────────
export async function insertReply(reply: Row): Promise<void> {
  await rest("/outreach_replies", {
    method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify([reply]),
  });
}

export async function insertEngagement(event: Row): Promise<void> {
  await rest("/outreach_engagement", {
    method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify([event]),
  }).catch(() => {});
}

// ── Events (run log) ─────────────────────────────────────────────────────────
export async function recordEvent(event: {
  stage: string; status: string; processed?: number; succeeded?: number;
  failed?: number; message?: string; metadata?: Row;
}): Promise<void> {
  await rest("/outreach_events", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify([{
      stage: event.stage, status: event.status,
      processed: event.processed ?? 0, succeeded: event.succeeded ?? 0, failed: event.failed ?? 0,
      message: event.message ?? null, metadata: event.metadata ?? {},
    }]),
  }).catch((e) => console.error("recordEvent failed (non-fatal):", e.message));
}

/** Suppression: an email is suppressed if any lead with it was skipped/opted-out. */
export async function isEmailSuppressed(email: string): Promise<boolean> {
  if (!email) return true;
  const q = new URLSearchParams({ select: "id", email: `eq.${email.toLowerCase()}`, status: "eq.skipped", limit: "1" });
  const rows = await rest<Row[]>("/outreach_leads", undefined, q).catch(() => []);
  return Boolean(rows && rows.length);
}

/** Bounce health over recent sends — drives the auto-pause + digest warning. */
export async function getBounceStats(): Promise<{ sent: number; bounced: number; rate: number }> {
  const rows = await rest<Row[]>("/outreach_messages", undefined,
    new URLSearchParams({ select: "status,bounced_at", order: "created_at.desc", limit: "200" })).catch(() => []);
  const sent = (rows || []).filter((m) => m.status === "sent").length;
  const bounced = (rows || []).filter((m) => m.bounced_at).length;
  return { sent, bounced, rate: sent ? bounced / sent : 0 };
}

export async function getRecentEvents(limit = 12): Promise<Row[]> {
  return (await rest<Row[]>("/outreach_events", undefined,
    new URLSearchParams({ select: "*", order: "created_at.desc", limit: String(limit) })).catch(() => [])) || [];
}

/** Count messages sent today (UTC) — used to enforce the daily send cap. */
export async function countSentToday(): Promise<number> {
  const since = new Date(Date.now()).toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const q = new URLSearchParams({ select: "id", status: "eq.sent", sent_at: `gte.${since}T00:00:00Z` });
  const rows = await rest<Row[]>("/outreach_messages", { headers: { Prefer: "count=exact" } }, q);
  return rows?.length ?? 0;
}
