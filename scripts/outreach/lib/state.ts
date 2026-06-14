/**
 * Per-source cursor state (outreach_source_state). FAIL-SOFT by design: if the table
 * doesn't exist yet (migration not run) or Supabase is unreachable, get() returns null
 * and set() is a no-op — sources then behave exactly as before (top-of-feed each night).
 */

const TIMEOUT = 10_000;
const url = () => process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function getSourceCursor<T = Record<string, any>>(source: string): Promise<T | null> {
  if (!url() || !key()) return null;
  try {
    const res = await fetch(`${url()}/rest/v1/outreach_source_state?source=eq.${source}&select=cursor&limit=1`, {
      headers: { apikey: key(), Authorization: `Bearer ${key()}` },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) { console.error(`(cursor) read failed for "${source}" — continuing without (run the source_state migration?)`); return null; }
    const rows = await res.json();
    return rows?.[0]?.cursor ?? null;
  } catch {
    return null;
  }
}

export async function setSourceCursor(source: string, cursor: Record<string, any>): Promise<void> {
  if (!url() || !key()) return;
  try {
    const res = await fetch(`${url()}/rest/v1/outreach_source_state?on_conflict=source`, {
      method: "POST",
      headers: {
        apikey: key(), Authorization: `Bearer ${key()}`, "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify([{ source, cursor, updated_at: new Date().toISOString() }]),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) console.error(`(cursor) write failed for "${source}" — continuing without`);
  } catch {
    /* fail-soft */
  }
}
