/**
 * App-side Supabase repository for the outreach admin dashboard + tracking endpoints.
 * Mirrors src/lib/blog/repository.ts (raw REST, service-role key, 15s timeout).
 */

const TIMEOUT = 15_000;
const url = () => process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function hasOutreachConfig() {
  return Boolean(url() && key());
}

async function rest<T>(path: string, init?: RequestInit, query?: URLSearchParams): Promise<T> {
  if (!hasOutreachConfig()) throw new Error("Supabase outreach config missing.");
  const res = await fetch(`${url()}/rest/v1${path}${query ? `?${query}` : ""}`, {
    ...init,
    headers: { apikey: key(), Authorization: `Bearer ${key()}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
    signal: init?.signal ?? AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  if (res.status === 204) return null as T;
  const t = await res.text();
  return t ? (JSON.parse(t) as T) : (null as T);
}

type Row = Record<string, any>;

export async function getOutreachLeads(opts: { status?: string; segment?: string; limit?: number } = {}): Promise<Row[]> {
  // optional lane filter (Jobs / Prospects / Local) — composes with any status, incl. to_review
  const seg = opts.segment && opts.segment !== "all" ? opts.segment : null;
  // "to_review" = leads with any pending draft MESSAGE (initial or follow-up). A plain
  // lead-status filter would miss follow-up drafts, whose lead is already 'sent'.
  if (opts.status === "to_review") {
    const msgs = await rest<Row[]>("/outreach_messages", undefined,
      new URLSearchParams({ select: "lead_id", status: "eq.draft", limit: "400" }));
    const ids = [...new Set((msgs || []).map((m) => m.lead_id).filter(Boolean))];
    if (!ids.length) return [];
    const q = new URLSearchParams({ select: "*", id: `in.(${ids.join(",")})`, order: "score.desc", limit: String(ids.length) });
    if (seg) q.set("segment", `eq.${seg}`); // lane + to_review compose
    return (await rest<Row[]>("/outreach_leads", undefined, q)) || [];
  }
  const q = new URLSearchParams({ select: "*", order: "created_at.desc", limit: String(opts.limit ?? 100) });
  if (opts.status && opts.status !== "all") q.set("status", `eq.${opts.status}`);
  else q.set("status", "neq.rejected"); // "all" hides audit rows; use the "rejected" filter to inspect them
  if (seg) q.set("segment", `eq.${seg}`);
  return (await rest<Row[]>("/outreach_leads", undefined, q)) || [];
}

export async function getLeadThread(leadId: string): Promise<{ lead: Row | null; messages: Row[]; replies: Row[]; engagement: Row[] }> {
  const [leads, messages, replies, engagement] = await Promise.all([
    rest<Row[]>("/outreach_leads", undefined, new URLSearchParams({ select: "*", id: `eq.${leadId}`, limit: "1" })),
    rest<Row[]>("/outreach_messages", undefined, new URLSearchParams({ select: "*", lead_id: `eq.${leadId}`, order: "created_at.asc" })),
    rest<Row[]>("/outreach_replies", undefined, new URLSearchParams({ select: "*", lead_id: `eq.${leadId}`, order: "created_at.asc" })),
    rest<Row[]>("/outreach_engagement", undefined, new URLSearchParams({ select: "*", lead_id: `eq.${leadId}`, order: "created_at.asc" })),
  ]);
  return { lead: leads?.[0] || null, messages: messages || [], replies: replies || [], engagement: engagement || [] };
}

export async function getOutreachStats(): Promise<Row> {
  const leads = (await rest<Row[]>("/outreach_leads", undefined, new URLSearchParams({ select: "id,status,segment,country,score,source" }))) || [];
  const messages = (await rest<Row[]>("/outreach_messages", undefined, new URLSearchParams({ select: "lead_id,status,kind,first_clicked_at,replied_at,bounced_at" }))) || [];
  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  for (const l of leads) { byStatus[l.status] = (byStatus[l.status] || 0) + 1; bySource[l.source] = (bySource[l.source] || 0) + 1; }
  const sent = messages.filter((m) => m.status === "sent").length;
  const clicked = messages.filter((m) => m.first_clicked_at).length;
  const replied = messages.filter((m) => m.replied_at).length;
  const bounced = messages.filter((m) => m.bounced_at).length;
  const draftMsgs = messages.filter((m) => m.status === "draft");

  // Per-lane breakdown so the dashboard can answer "what do I send today, per playbook" and
  // "am I over-investing in one lane?". Messages join to leads by lead_id → segment.
  const segOf: Record<string, string> = {};
  for (const l of leads) segOf[l.id] = l.segment;
  const bySegment: Record<string, Row> = {};
  for (const key of ["hiring_signal", "prospect", "local_no_website"]) {
    const segLeads = leads.filter((l) => l.segment === key);
    const segMsgs = messages.filter((m) => segOf[m.lead_id] === key);
    const segByStatus: Record<string, number> = {};
    for (const l of segLeads) segByStatus[l.status] = (segByStatus[l.status] || 0) + 1;
    const sSent = segMsgs.filter((m) => m.status === "sent").length;
    const sReplied = segMsgs.filter((m) => m.replied_at).length;
    bySegment[key] = {
      total: segLeads.length,
      byStatus: segByStatus,
      // count LEADS with a pending draft (not messages) — the Desk shows one card per lead, so a
      // lead with both an initial + follow-up draft must read as 1 "to send", not 2.
      toReview: new Set(segMsgs.filter((m) => m.status === "draft").map((m) => m.lead_id)).size,
      sent: sSent,
      clicked: segMsgs.filter((m) => m.first_clicked_at).length,
      replied: sReplied,
      bounced: segMsgs.filter((m) => m.bounced_at).length,
      replyRate: sSent ? Math.round((sReplied / sSent) * 1000) / 10 : 0,
    };
  }

  return {
    totalLeads: leads.length, byStatus, bySource, bySegment,
    sent, clicked, replied, bounced,
    // unique leads with a pending draft — matches the Desk's one-card-per-lead view (sum of lane chips)
    toReview: new Set(draftMsgs.map((m) => m.lead_id)).size,
    pendingFollowups: draftMsgs.filter((m) => m.kind === "followup").length,
    replyRate: sent ? Math.round((replied / sent) * 1000) / 10 : 0,
  };
}

export async function setMessageStatus(messageId: string, status: string): Promise<void> {
  const extra: Record<string, string | null> = {};
  if (status === "approved") extra.approved_at = new Date().toISOString();
  if (status === "sent") { extra.sent_at = new Date().toISOString(); extra.send_mode = "manual"; }
  if (status === "draft") { extra.sent_at = null; extra.send_mode = null; } // undo
  await rest("/outreach_messages", {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status, ...extra }),
  }, new URLSearchParams({ id: `eq.${messageId}` }));
}

export async function setLeadStatus(leadId: string, status: string): Promise<void> {
  await rest("/outreach_leads", {
    method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status }),
  }, new URLSearchParams({ id: `eq.${leadId}` }));
}

/** Skip every pending draft of a lead — without this, skipping a lead leaves its drafts
 *  counted in the digest/to-review queue forever. */
export async function skipLeadDraftMessages(leadId: string): Promise<void> {
  await rest("/outreach_messages", {
    method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "skipped" }),
  }, new URLSearchParams({ lead_id: `eq.${leadId}`, status: "eq.draft" }));
}

/** Inverse of skipLeadDraftMessages — used by the "undo skip" affordance to put a lead's
 *  skipped drafts back into the review queue. Only flips skipped→draft (never touches sent). */
export async function restoreLeadDraftMessages(leadId: string): Promise<void> {
  await rest("/outreach_messages", {
    method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "draft" }),
  }, new URLSearchParams({ lead_id: `eq.${leadId}`, status: "eq.skipped" }));
}

export async function getMessageById(messageId: string): Promise<Row | null> {
  const rows = await rest<Row[]>("/outreach_messages", undefined,
    new URLSearchParams({ select: "*", id: `eq.${messageId}`, limit: "1" }));
  return rows?.[0] || null;
}

export async function saveReply(reply: Row): Promise<void> {
  await rest("/outreach_replies", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify([reply]) });
}

// ── Tracking ────────────────────────────────────────────────────────────────
export async function messageByToken(token: string): Promise<Row | null> {
  const rows = await rest<Row[]>("/outreach_messages", undefined, new URLSearchParams({ select: "*", tracking_token: `eq.${token}`, limit: "1" }));
  return rows?.[0] || null;
}

export async function recordClick(msg: Row, target: string, meta: { ua?: string; ipHash?: string }): Promise<void> {
  await rest("/outreach_engagement", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify([{ message_id: msg.id, lead_id: msg.lead_id, event: "clicked", target, user_agent: meta.ua, ip_hash: meta.ipHash }]) }).catch(() => {});
  if (!msg.first_clicked_at) {
    await rest("/outreach_messages", { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ first_clicked_at: new Date().toISOString(), click_count: (msg.click_count || 0) + 1 }) }, new URLSearchParams({ id: `eq.${msg.id}` })).catch(() => {});
  }
}

export async function recordOpen(msg: Row): Promise<void> {
  if (!msg.first_opened_at) {
    await rest("/outreach_messages", { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ first_opened_at: new Date().toISOString(), open_count: (msg.open_count || 0) + 1 }) }, new URLSearchParams({ id: `eq.${msg.id}` })).catch(() => {});
  }
}

export async function leadByCompanySlug(slug: string): Promise<Row | null> {
  const rows = await rest<Row[]>("/outreach_leads", undefined, new URLSearchParams({ select: "*", limit: "400", order: "created_at.desc" }));
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return (rows || []).find((l) => norm(l.company_name) === slug) || null;
}
