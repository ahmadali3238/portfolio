"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw, ExternalLink, Check, X, Mail, MessageCircle, Phone, MapPin, ChevronDown, Search, Copy, Keyboard, AlertTriangle } from "lucide-react";

interface Props {
  readonly initialLeads: any[];
  readonly initialStats: any;
  readonly configured: boolean;
  readonly adminEmail: string;
}

/** The three outreach LANES — one source of truth shared by cards, sections, tabs, stats, and
 *  the thread header, so the operator always knows the playbook + channel of a lead. */
const LANES = [
  // `edge` = section-header left border. `bar` = an inset box-shadow on cards (instead of a
  // left border) so the selected-state border-color can't override the lane color.
  { key: "hiring_signal",    label: "Jobs",        short: "JOB",      Icon: Mail,          tone: "blue",  edge: "border-l-blue-500",  bar: "shadow-[inset_4px_0_0_0_rgb(59,130,246)]",  channel: "EMAIL" },
  { key: "prospect",         label: "Prospects",   short: "PROSPECT", Icon: Mail,          tone: "amber", edge: "border-l-amber-500", bar: "shadow-[inset_4px_0_0_0_rgb(245,158,11)]",  channel: "EMAIL" },
  { key: "local_no_website", label: "Local sites", short: "LOCAL",    Icon: MessageCircle, tone: "green", edge: "border-l-green-500", bar: "shadow-[inset_4px_0_0_0_rgb(34,197,94)]",   channel: "WHATSAPP" },
] as const;
const laneOf = (seg: string) => LANES.find((L) => L.key === seg) || LANES[1];
const laneLabel = (key: string) => (key === "all" ? "All" : laneOf(key).label);

const STATUSES = ["to_review", "all", "sourced", "enriched", "drafted", "sent", "replied", "email_blocked", "skipped", "rejected"];

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = window.localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function writeLS(key: string, val: unknown) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
}

async function fetchLeads(status: string, segment = "all") {
  const seg = segment && segment !== "all" ? `&segment=${segment}` : "";
  const r = await fetch(`/api/admin/outreach?view=leads&status=${status}&limit=300${seg}`, { cache: "no-store" });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error || "failed to load leads");
  return j.leads as any[];
}
async function fetchStats() {
  const r = await fetch(`/api/admin/outreach?view=stats`, { cache: "no-store" });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error || "failed to load stats"); // throw so a 500 doesn't silently zero the KPIs
  return j.stats;
}
async function post(path: string, body: any) {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error || "failed");
  return j;
}

function Badge({ children, tone = "muted" }: { children: React.ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    muted: "bg-muted text-muted-foreground",
    green: "bg-green-500/15 text-green-600 dark:text-green-400",
    blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    amber: "bg-amber-500/15 text-amber-600 dark:text-amber-500",
    red: "bg-red-500/15 text-red-600 dark:text-red-400",
  };
  return <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
}

const STATUS_TONE: Record<string, string> = {
  sent: "green", replied: "green", drafted: "blue", enriched: "blue",
  email_blocked: "amber", bounced: "red", skipped: "muted", sourced: "muted",
};

// status_reason is dev audit data (e.g. "enrich:inpost") — only worth showing on cards that were
// filtered OUT, where the reason matters. On healthy/pursued leads it's noise.
const AUDIT_STATUSES = new Set(["rejected", "skipped", "email_blocked", "over_required_experience", "enrich_failed"]);
const PER_LANE_CAP = 8; // Desk shows the top N per lane (score-sorted) with a "show all" expander

function cleanStack(stack: any): string {
  return [...new Set((Array.isArray(stack) ? stack : []).filter((x: string) => x && x !== "next"))].slice(0, 3).join(", ");
}

// Primary navigation = the operator's JOBS-TO-BE-DONE, not the engine's DB pipeline. Each tab is a
// preset over the existing status filter, so "see my sent emails" / "see replies" is one click.
const VIEWS = [
  { key: "to_send",   label: "To Send",    status: "to_review", grouped: true },
  { key: "sent",      label: "Sent",       status: "sent",      grouped: false },
  { key: "replies",   label: "Replies",    status: "replied",   grouped: false },
  { key: "followups", label: "Follow-ups", status: "sent",      grouped: false }, // sent, no reply, aged (client-derived)
  { key: "all",       label: "All leads",  status: "all",       grouped: false },
] as const;
type ViewKey = (typeof VIEWS)[number]["key"];

// plain-language labels so the user never sees raw DB enums like "to_review" / "email_blocked"
const STATUS_LABELS: Record<string, string> = {
  to_review: "To review", all: "All", sourced: "Sourced", enriched: "Ready to draft", drafted: "Drafted",
  sent: "Sent", replied: "Replied", email_blocked: "Email-blocked", skipped: "Skipped", rejected: "Filtered out",
  bounced: "Bounced", over_required_experience: "Over-level", enrich_failed: "No email found",
};
const statusLabel = (st: string) => STATUS_LABELS[st] || st.replace(/_/g, " ");
const STATUS_HELP: Record<string, string> = {
  to_review: "Has a draft waiting for you to send", sourced: "Found — not yet enriched",
  enriched: "Email verified, ready to draft", drafted: "Draft written, ready to send",
  sent: "Email sent — awaiting a reply", replied: "They responded",
  email_blocked: "Opt-in-only country — reach out on LinkedIn instead", skipped: "You skipped this lead",
  rejected: "Filtered out by the quality/geo gates", bounced: "The email bounced",
  enrich_failed: "No deliverable email could be found", over_required_experience: "Wants more experience than you have",
};
// status sub-filter inside "All leads" only (to_review lives in its own To Send tab)
const ALL_VIEW_STATUSES = ["all", "drafted", "sent", "replied", "sourced", "enriched", "bounced", "email_blocked", "skipped", "rejected"];
const todayKey = () => new Date().toDateString();

function emptyMessage(view: string, searchActive: boolean, query: string): string {
  if (searchActive) return `No leads match “${query}”.`;
  switch (view) {
    case "to_send": return "🎉 Nothing needs sending right now. New drafts land here after the nightly run.";
    case "sent": return "No sent emails yet — send some from the To Send tab and they'll show up here.";
    case "replies": return "No replies yet. When someone responds it appears here (ingested via IMAP, or paste a reply into a thread to classify it).";
    case "followups": return "No follow-ups due — nothing you sent 3+ days ago is still waiting on a reply.";
    default: return "No leads match this filter.";
  }
}

const SORTS: Record<string, (a: any, b: any) => number> = {
  score: (a, b) => (b.score || 0) - (a.score || 0),
  newest: (a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0),
  oldest: (a, b) => Date.parse(a.created_at || 0) - Date.parse(b.created_at || 0),
};

/** Client-side mirror of the worker's deterministic JD-requirement rules
 *  (keep in sync with scripts/outreach/lib/email-content.ts). */
function jdDemands(postText: string) {
  const t = postText || "";
  const links: string[] = [];
  if (/\bgithub\b|link to (?:your )?(?:code|projects?|repo(?:s|sitory|sitories)?)|(?:code|work) samples?|samples? of your (?:code|work)|open[- ]source (?:work|contributions)/i.test(t)) links.push("github");
  if (/\blinkedin\b/i.test(t)) links.push("linkedin");
  if (/\bupwork\b/i.test(t)) links.push("upwork");
  if (/\byoutube\b/i.test(t)) links.push("youtube");
  return {
    links,
    resume: /\b(your|a|an|attach(?:ed)?|include|send|submit|share|with|updated)\s+(?:updated\s+)?(resume|cv|c\.v\.)\b/i.test(t) || /\b(resume|cv)\s*(?:\/|and|&|\+)\s*(cover letter|cv|resume)/i.test(t),
    coverLetter: /cover letter/i.test(t),
    applyForm: /(greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com|bamboohr\.com|breezy\.hr|smartrecruiters\.com)/i.test(t) || /\bapply (?:at|via|through|using|on) (?:the |our )?(?:link|form|site|portal|page|website)\b/i.test(t) || /\b(?:do not|don'?t) email\b|\bno emails? please\b/i.test(t),
    video: /\b(?:loom|video (?:intro(?:duction)?|application|cover letter|message))\b/i.test(t),
    rate: /(?:include|share|send|state|mention|tell us|with|provide)[^.\n]{0,50}\b(?:hourly )?(?:rate|salary|compensation)\b|\b(?:rate|salary|compensation) (?:expectations?|requirements?)\b/i.test(t),
  };
}

/** "Jun 3 · 7d ago" from an ISO date (null-safe — old leads didn't capture it). */
function postedLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const days = Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
  const date = new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${date} · ${days === 0 ? "today" : `${days}d ago`}`;
}

const SHORTCUTS: [string, string][] = [
  ["j / k", "next / previous lead"],
  ["o", "open compose & mark sent"],
  ["x", "skip lead"],
  ["/", "search"],
  ["?", "toggle this help"],
  ["Esc", "back to list"],
];

function HelpCard({ onClose }: { onClose?: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 font-semibold"><Keyboard className="h-4 w-4" /> How this works</span>
        {onClose ? <button onClick={onClose} aria-label="Dismiss help" className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button> : null}
      </div>
      <ol className="mb-3 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
        <li>Pick a lead — read its draft on the right.</li>
        <li>Hit <b className="text-foreground">Open in Gmail</b> / <b className="text-foreground">Send on WhatsApp</b> to send it.</li>
        <li>Opening auto-marks it <b className="text-foreground">sent</b> and jumps to the next — tap <b className="text-foreground">Undo</b> if you didn&apos;t actually send.</li>
      </ol>
      <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
        {SHORTCUTS.map(([k, d]) => (
          <div key={k} className="flex items-center gap-2">
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">{k}</kbd>
            <span className="text-muted-foreground">{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="space-y-2.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-border p-3">
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
          <div className="mt-3 flex gap-1.5">{[0, 1, 2].map((j) => <div key={j} className="h-4 w-12 animate-pulse rounded-full bg-muted" />)}</div>
        </div>
      ))}
    </div>
  );
}

/** One lead card — used identically in Desk sections and the Pipeline list. Lane is encoded
 *  via colored edge + chip + channel icon, and the body line is tailored to the playbook. */
function LeadCard({ lead: l, selected, onClick }: { lead: any; selected: boolean; onClick: () => void }) {
  const cfg = laneOf(l.segment);
  const isLocal = l.segment === "local_no_website";
  const sr = l.signal_raw || {};
  const age = postedLabel(sr.postedAt) ?? postedLabel(l.created_at);
  const contact = isLocal ? (sr.displayPhone || sr.waPhone || l.phone || "no phone") : (l.email || "no email");
  const d = !isLocal ? jdDemands(`${l.signal || ""}\n${sr.description || ""}`) : null;

  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-xl border ${cfg.bar} py-3 pl-4 pr-3 text-left transition-colors hover:bg-muted/50 ${
        selected ? "border-primary bg-muted/40" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold">{l.company_name}</div>
          <div className="truncate text-xs text-muted-foreground">{contact}{isLocal ? " · WhatsApp" : ""}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-bold">{l.score}</div>
          <div className="text-[11px] text-muted-foreground">score</div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge tone={cfg.tone}><cfg.Icon className="h-3 w-3" />{cfg.short}</Badge>
        <span title={STATUS_HELP[l.status] || ""}><Badge tone={STATUS_TONE[l.status] || "muted"}>{statusLabel(l.status)}</Badge></span>
        <Badge>{l.source}</Badge>
        {l.country ? <Badge>{l.country}</Badge> : null}
        {age ? <Badge tone="blue">{sr.postedAt ? "posted" : "added"} {age}</Badge> : null}
      </div>

      {/* lane-tailored context line */}
      {l.segment === "hiring_signal" && d ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground/80">
          {(sr.seniority || sr.requiredYears || (sr.stack || []).length) ? (
            <span className="truncate">{[sr.seniority, sr.requiredYears ? `${sr.requiredYears}y` : null, cleanStack(sr.stack)].filter(Boolean).join(" · ")}</span>
          ) : null}
          {d.resume ? <span title="asks for a resume/CV">📎</span> : null}
          {d.links.includes("github") ? <span title="asks for GitHub">🔗</span> : null}
          {d.rate ? <span title="asks for rate/salary">💲</span> : null}
          {d.video ? <span title="asks for a video intro">🎥</span> : null}
          {d.applyForm ? <span className="text-amber-600 dark:text-amber-500" title="apply via form/portal">⚠ form</span> : null}
        </div>
      ) : null}
      {l.segment === "prospect" ? (
        <div className="mt-1.5 line-clamp-1 text-xs italic text-muted-foreground">{sr.description || l.signal}</div>
      ) : null}
      {isLocal ? (
        <div className="mt-1.5 truncate text-xs text-muted-foreground">🏪 {[sr.categoryLabel || sr.category, sr.city].filter(Boolean).join(" · ") || "local business"}</div>
      ) : null}

      {l.status_reason && AUDIT_STATUSES.has(l.status) ? <div className="mt-1 truncate text-[11px] text-muted-foreground">{l.status_reason}</div> : null}
    </button>
  );
}

export default function OutreachDashboard({ initialLeads, initialStats, configured, adminEmail }: Props) {
  const [view, setView] = useState<ViewKey>("to_send");
  const [allStatus, setAllStatus] = useState("all"); // status sub-filter inside the All-leads view
  const [lane, setLane] = useState("all");
  const [sort, setSort] = useState<"score" | "newest" | "oldest">(() => readLS("outreach.sort", "score"));
  // collapse state is per-DAY so a lane collapsed yesterday doesn't silently hide today's drafts
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const saved = readLS<{ day?: string; v?: Record<string, boolean> }>("outreach.collapsed", {});
    return saved.day === todayKey() ? (saved.v || {}) : {};
  });
  const [query, setQuery] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({}); // per-lane "show all"
  const [listLimit, setListLimit] = useState(25);                        // flat-view "show more" window
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const searchRef = useRef<HTMLInputElement | null>(null);
  const orderedRef = useRef<any[]>([]);
  const selectedRef = useRef<any | null>(null);

  useEffect(() => writeLS("outreach.sort", sort), [sort]);
  useEffect(() => writeLS("outreach.collapsed", { day: todayKey(), v: collapsed }), [collapsed]);

  const viewCfg = VIEWS.find((v) => v.key === view) || VIEWS[0];
  const activeStatus = view === "all" ? allStatus : viewCfg.status;
  const leadsQ = useQuery({
    queryKey: ["outreach-leads", view, lane, view === "all" ? allStatus : ""],
    queryFn: () => fetchLeads(activeStatus, view === "to_send" ? "all" : lane),
    initialData: view === "to_send" && lane === "all" ? initialLeads : undefined, // SSR pre-fetches To Send
    placeholderData: keepPreviousData,
  });
  const statsQ = useQuery({ queryKey: ["outreach-stats"], queryFn: fetchStats, initialData: initialStats });
  // global SEARCH spans every status — before, search only saw the current slice and "lost" sent/replied leads
  const q = query.trim().toLowerCase();
  const searchActive = q.length > 0;
  const searchQ = useQuery({ queryKey: ["outreach-search"], queryFn: () => fetchLeads("all", "all"), enabled: searchActive, staleTime: 30_000 });

  const s = statsQ.data || {};
  const matches = (l: any) => [l.company_name, l.email, l.signal, l.signal_raw?.city, l.signal_raw?.categoryLabel].some((v) => String(v || "").toLowerCase().includes(q));

  let baseLeads: any[] = leadsQ.data || [];
  if (view === "followups") {
    // "sent 3+ days ago, still no reply" — status 'sent' already means awaiting-reply (a reply flips
    // the lead to 'replied'); updated_at ≈ when it was marked sent.
    const cutoff = Date.now() - 3 * 86_400_000;
    baseLeads = baseLeads
      .filter((l) => l.updated_at && Date.parse(l.updated_at) < cutoff)
      .sort((a, b) => Date.parse(a.updated_at) - Date.parse(b.updated_at));
  }
  const isGrouped = viewCfg.grouped && !searchActive;
  const leads = searchActive ? (searchQ.data || []).filter(matches) : baseLeads;
  const grouped = LANES.filter((L) => lane === "all" || L.key === lane).map((L) => ({ ...L, items: leads.filter((l: any) => l.segment === L.key).sort(SORTS[sort]) }));
  const flatLeads = view === "followups" && !searchActive ? leads : [...leads].sort(SORTS[sort]);
  const orderedLeads = isGrouped ? grouped.filter((g) => !collapsed[g.key]).flatMap((g) => g.items) : flatLeads;
  orderedRef.current = orderedLeads;
  selectedRef.current = selected;
  const listEmpty = isGrouped ? grouped.every((g) => !g.items.length) : flatLeads.length === 0;
  const laneCount = (key: string) => baseLeads.filter((l: any) => l.segment === key).length;

  // on mobile the thread replaces the list in place — jump to the top so it opens from its header
  const selectLead = (l: any) => {
    setSelected(l);
    if (typeof window !== "undefined" && window.innerWidth < 1024) window.scrollTo({ top: 0, behavior: "smooth" });
  };
  // "send-and-move-on": after a lead is handled, advance to the next one (desktop) or back to the list (mobile)
  const advanceFrom = (handledId: string) => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) { setSelected(null); return; }
    const arr = orderedRef.current;
    const i = arr.findIndex((l) => l.id === handledId);
    setSelected(arr[i + 1] || arr[i - 1] || null);
  };
  const setLaneFilter = (key: string) => { setLane(key); setSelected(null); };

  // keyboard triage — only when not typing in a field
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (e.key === "Escape") (document.activeElement as HTMLElement)?.blur();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const arr = orderedRef.current;
      const cur = selectedRef.current;
      const idx = cur ? arr.findIndex((l) => l.id === cur.id) : -1;
      if (e.key === "j") { const n = arr[idx + 1] || arr[0]; if (n) selectLead(n); e.preventDefault(); }
      else if (e.key === "k") { const p = idx > 0 ? arr[idx - 1] : arr[arr.length - 1]; if (p) selectLead(p); e.preventDefault(); }
      else if (e.key === "o") { (document.querySelector("[data-primary-compose]") as HTMLElement)?.click(); }
      else if (e.key === "x") { (document.querySelector("[data-skip]") as HTMLElement)?.click(); }
      else if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === "?") { setShowHelp((v) => !v); }
      else if (e.key === "Escape") { setSelected(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []); // refs keep this current; listener is mounted once

  if (!configured) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h1 className="mb-2 text-xl font-bold">Outreach</h1>
        <p className="text-sm text-muted-foreground">Supabase isn&apos;t configured or the migration hasn&apos;t run yet.</p>
      </div>
    );
  }

  const refetchAll = () => { leadsQ.refetch(); statsQ.refetch(); };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Outreach</h1>
          <p className="text-xs text-muted-foreground">{adminEmail}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…  ( / )"
              aria-label="Search leads"
              className="w-40 rounded-lg border border-border bg-background py-1.5 pl-8 pr-2 text-sm focus:w-52 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button onClick={() => setShowHelp((v) => !v)} aria-label="Keyboard shortcuts" className="rounded-lg border border-border p-1.5 hover:bg-muted"><Keyboard className="h-4 w-4" /></button>
          <button
            onClick={refetchAll}
            disabled={leadsQ.isFetching}
            aria-label="Refresh"
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${leadsQ.isFetching ? "animate-spin" : ""}`} /> <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {showHelp ? <HelpCard onClose={() => setShowHelp(false)} /> : null}

      {/* Outcomes bar — the big "to send" count + the four KPIs, now CLICKABLE (each jumps to its view) */}
      <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <button onClick={() => { setView("to_send"); setSelected(null); }} className="flex items-baseline gap-1.5 text-left">
            <span className="text-2xl font-bold sm:text-3xl">{s.toReview ?? 0}</span>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">to send today</span>
          </button>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground sm:ms-auto">
            {statsQ.isError ? (
              <button onClick={() => statsQ.refetch()} className="inline-flex items-center gap-1 text-amber-600 hover:underline"><AlertTriangle className="h-3.5 w-3.5" /> stats unavailable — retry</button>
            ) : (
              <>
                <button onClick={() => { setView("sent"); setSelected(null); }} className="hover:text-foreground">Sent <b className="text-foreground">{s.sent ?? 0}</b></button>
                <button onClick={() => { setView("replies"); setSelected(null); }} className="hover:text-foreground">Replied <b className="text-green-600 dark:text-green-400">{s.replied ?? 0}</b> ({s.replyRate ?? 0}%)</button>
                <button onClick={() => { setView("sent"); setSelected(null); }} className="hover:text-foreground">Clicked <b className="text-blue-600 dark:text-blue-400">{s.clicked ?? 0}</b></button>
                <button onClick={() => { setView("all"); setAllStatus("bounced"); setSelected(null); }} className="hover:text-foreground">Bounced <b className={s.bounced ? "text-red-600 dark:text-red-400" : "text-foreground"}>{s.bounced ?? 0}</b></button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Primary nav — action-named views (the operator's jobs), each with a live count */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {VIEWS.map((v) => {
          const count = v.key === "to_send" ? s.toReview : v.key === "sent" ? s.sent : v.key === "replies" ? s.replied : v.key === "all" ? s.totalLeads : null;
          return (
            <button
              key={v.key}
              onClick={() => { setView(v.key); setSelected(null); setListLimit(25); if (v.key !== "all") setAllStatus("all"); }}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${view === v.key ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
            >
              {v.label}
              {count != null ? <span className={`rounded-full px-1.5 text-xs ${view === v.key ? "bg-primary-foreground/20" : "bg-muted"}`}>{count}</span> : null}
              {v.key === "replies" && (s.replied ?? 0) > 0 ? <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> : null}
            </button>
          );
        })}
      </div>

      {/* Secondary — lane filter (applies to the active view) + sort */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
          {[{ key: "all", label: "All", Icon: null as any }, ...LANES].map((L) => (
            <button
              key={L.key}
              onClick={() => setLaneFilter(L.key)}
              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs transition-colors ${lane === L.key ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"}`}
            >
              {L.Icon ? <L.Icon className="h-3 w-3" /> : null} {L.label}{L.key !== "all" ? <b className="ml-0.5">{laneCount(L.key)}</b> : null}
            </button>
          ))}
        </div>
        <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          sort
          <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="rounded-lg border border-border bg-background px-2 py-1 text-xs">
            <option value="score">score</option>
            <option value="newest">newest</option>
            <option value="oldest">oldest</option>
          </select>
        </label>
      </div>

      {/* All-leads view: a plain-labeled status sub-filter (with tooltips), instead of raw enums */}
      {view === "all" && !searchActive ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {ALL_VIEW_STATUSES.map((st) => (
            <button
              key={st}
              onClick={() => { setAllStatus(st); setSelected(null); }}
              title={STATUS_HELP[st] || ""}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${allStatus === st ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
            >
              {statusLabel(st)}{st !== "all" && s.byStatus?.[st] != null ? ` ${s.byStatus[st]}` : ""}
            </button>
          ))}
        </div>
      ) : null}

      {searchActive ? (
        <p className="text-xs text-muted-foreground">
          Searching <b>all leads</b> for &ldquo;{query}&rdquo; — {leads.length} match{leads.length === 1 ? "" : "es"}.{" "}
          <button onClick={() => setQuery("")} className="underline hover:text-foreground">clear</button>
        </p>
      ) : null}

      {/* Two-pane: list + thread. Mobile shows one at a time. `grid-cols-1` (a minmax(0,1fr)
          track) on mobile is REQUIRED — without it the implicit auto track sizes to max-content
          and the cards overflow the viewport horizontally. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className={`${selected ? "hidden lg:block" : "block"} ${leadsQ.isPlaceholderData ? "opacity-60" : ""}`}>
          {leadsQ.isError ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-6 text-center text-sm">
              <p className="mb-2 text-red-600 dark:text-red-400">Couldn&apos;t load leads — {(leadsQ.error as Error)?.message}</p>
              <button onClick={() => leadsQ.refetch()} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">Retry</button>
            </div>
          ) : leadsQ.isPending ? (
            <CardSkeleton />
          ) : isGrouped ? (
            listEmpty ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                {emptyMessage(view, searchActive, query)}
              </div>
            ) : (
              <div className="space-y-5">
                {grouped.filter((g) => g.items.length).map((g) => {
                  const ls = s.bySegment?.[g.key];
                  const shown = expanded[g.key] ? g.items : g.items.slice(0, PER_LANE_CAP);
                  return (
                    <section key={g.key} ref={(el) => { sectionRefs.current[g.key] = el; }}>
                      <button
                        onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))}
                        aria-expanded={!collapsed[g.key]}
                        aria-label={`Toggle ${g.label} section`}
                        className={`flex w-full items-center gap-2 border-l-4 ${g.edge} rounded-r-md bg-muted/40 px-2.5 py-1.5`}
                      >
                        <g.Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate text-sm font-semibold uppercase tracking-wide">{g.label}</span>
                        <Badge tone={g.tone}>{g.items.length}</Badge>
                        {ls?.sent ? <span className="hidden whitespace-nowrap text-[11px] text-muted-foreground sm:inline">· sent {ls.sent} · {ls.replyRate ?? 0}% reply</span> : null}
                        <ChevronDown className={`ms-auto h-4 w-4 shrink-0 transition-transform ${collapsed[g.key] ? "-rotate-90" : ""}`} />
                      </button>
                      {!collapsed[g.key] ? (
                        <div className="mt-2 space-y-2.5">
                          {shown.map((l: any) => <LeadCard key={l.id} lead={l} selected={selected?.id === l.id} onClick={() => selectLead(l)} />)}
                          {g.items.length > PER_LANE_CAP ? (
                            <button
                              onClick={() => setExpanded((e) => ({ ...e, [g.key]: !e[g.key] }))}
                              className="w-full rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50"
                            >
                              {expanded[g.key] ? "Show fewer" : `Show all ${g.items.length} ${g.label} →`}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            )
          ) : flatLeads.length ? (
            <div className="space-y-2.5">
              {flatLeads.slice(0, listLimit).map((l: any) => <LeadCard key={l.id} lead={l} selected={selected?.id === l.id} onClick={() => selectLead(l)} />)}
              {flatLeads.length > listLimit ? (
                <button onClick={() => setListLimit((n) => n + 25)} className="w-full rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50">
                  Show more — {flatLeads.length - listLimit} more
                </button>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {emptyMessage(view, searchActive, query)}
            </div>
          )}
        </div>

        {/* Thread */}
        <div className={`${selected ? "block" : "hidden lg:block"}`}>
          {selected ? (
            <ThreadPanel lead={selected} onBack={() => setSelected(null)} onChange={refetchAll} onResolved={advanceFrom} />
          ) : (
            <div className="hidden lg:sticky lg:top-4 lg:block">
              <HelpCard />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ThreadPanel({ lead, onBack, onChange, onResolved }: { lead: any; onBack: () => void; onChange: () => void; onResolved: (id: string) => void }) {
  const [reply, setReply] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { setIsMobile(/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)); }, []);
  const cfg = laneOf(lead.segment);

  const threadQ = useQuery({
    queryKey: ["outreach-thread", lead.id],
    queryFn: async () => {
      const r = await fetch(`/api/admin/outreach?view=thread&leadId=${lead.id}`, { cache: "no-store" });
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || "failed to load conversation");
      return r.json();
    },
  });

  const t = threadQ.data || {};
  // leadIdOverride pins the target lead at call-time: after a skip auto-advances the panel to the
  // NEXT lead, the Undo toast must still restore the lead that was actually skipped — so we capture
  // its id here and pass it through, never re-reading the (now-changed) `lead` prop.
  async function act(action: string, messageId?: string, leadIdOverride?: string) {
    const leadId = leadIdOverride || lead.id;
    try {
      await post("/api/admin/outreach/approve", { leadId, messageId, action });
      if (action === "skip") toast.success("Skipped", { action: { label: "Undo", onClick: () => act("restore", undefined, leadId) } });
      else if (action === "restore") toast.success("Restored to queue");
      else toast.success({ sent: "Marked sent", unsend: "Undone", approve: "Approved" }[action] || "Done");
      threadQ.refetch(); onChange();
      if (action === "sent" || action === "skip") onResolved(leadId);
    } catch (e) {
      toast.error((e as Error).message || "Couldn’t save — try again");
    }
  }
  async function classify() {
    setBusy(true); setResult(null); // clear any stale error from a previous attempt
    try { setResult((await post("/api/admin/outreach/classify", { leadId: lead.id, replyText: reply, company: lead.company_name })).classification); onChange(); }
    catch (e) { const m = (e as Error).message; setResult({ error: m }); toast.error(m); } finally { setBusy(false); }
  }
  function copyBody(body: string) {
    navigator.clipboard?.writeText(body).then(() => toast.success("Draft copied"), () => toast.error("Copy failed"));
  }

  return (
    <div className="space-y-3 rounded-xl border border-border p-3 sm:p-4 lg:sticky lg:top-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} aria-label="Back to list" className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted lg:hidden">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <h2 className="min-w-0 truncate font-semibold">{lead.company_name}</h2>
        <Badge tone={cfg.tone}><cfg.Icon className="h-3 w-3" />{cfg.short} · {cfg.channel}</Badge>
        {lead.status === "replied" ? <Badge tone="green">replied</Badge> : null}
        {lead.status === "bounced" ? <Badge tone="red">bounced</Badge> : null}
        <button onClick={() => act("skip")} data-skip aria-label="Skip this lead" className="ms-auto inline-flex shrink-0 items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-xs text-red-500 hover:border-border hover:underline">
          <X className="h-3.5 w-3.5" /> skip
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{lead.signal}</p>
      {postedLabel(lead.signal_raw?.postedAt) ? <p className="text-xs text-muted-foreground">📅 Posted {postedLabel(lead.signal_raw?.postedAt)}</p> : null}
      {lead.segment === "local_no_website" ? (
        <div className="space-y-1.5 rounded-lg bg-green-500/10 px-2.5 py-2 text-xs text-green-700 dark:text-green-400">
          <div>🏪 <b>{lead.signal_raw?.categoryLabel || lead.signal_raw?.category || "local business"}</b>{lead.signal_raw?.city ? ` · ${lead.signal_raw.city}` : ""} — pitch: free basic website, paid extras.</div>
          {lead.signal_raw?.displayPhone ? <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.signal_raw.displayPhone}</div> : null}
          {lead.signal_raw?.address ? <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {lead.signal_raw.address}</div> : null}
          {lead.source_url ? <a href={lead.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline"><ExternalLink className="h-3 w-3" /> View on OpenStreetMap</a> : null}
        </div>
      ) : null}
      {lead.segment === "local_no_website" ? null : (() => {
        const d = jdDemands(`${lead.signal || ""}\n${lead.signal_raw?.description || ""}`);
        return (
          <>
            {d.applyForm ? (
              <p className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-600 dark:text-amber-500">
                ⚠ Post says to apply via a <b>form/portal</b> — a cold email may be ignored. Consider applying there too (or instead).
              </p>
            ) : null}
            {(d.resume || d.coverLetter) ? (
              <p className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-600 dark:text-amber-500">
                📎 They ask for a {[d.resume && "resume", d.coverLetter && "cover letter"].filter(Boolean).join(" + ")} — attach it in Gmail before sending (compose links can&apos;t carry files).
              </p>
            ) : null}
            {d.video ? <p className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-600 dark:text-amber-500">🎥 They ask for a Loom/video intro — record one before sending if you want this lead.</p> : null}
            {d.rate ? <p className="text-xs text-muted-foreground">💰 Post asks for rate/salary expectations — check the draft handles it the way you want.</p> : null}
            {d.links.length ? <p className="text-xs text-muted-foreground">🔗 Post asks for: <b>{d.links.join(", ")}</b> — check the footer includes them.</p> : null}
          </>
        );
      })()}
      {lead.signal_raw?.description ? (
        <details className="rounded-lg border border-border">
          <summary className="cursor-pointer px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
            {lead.segment === "local_no_website" ? "Business details" : "Job description / about"}
          </summary>
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words border-t border-border p-2.5 font-sans text-xs text-muted-foreground">{lead.signal_raw.description}</pre>
        </details>
      ) : null}

      {threadQ.isError ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-3 text-xs">
          <p className="mb-1.5 text-red-600 dark:text-red-400">Couldn&apos;t load the conversation.</p>
          <button onClick={() => threadQ.refetch()} className="rounded border border-border px-2 py-1 hover:bg-muted">Retry</button>
        </div>
      ) : threadQ.isPending ? (
        <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : (
      <div className="space-y-2.5">
        {(t.messages || []).map((m: any) => (
          <div key={m.id} className="rounded-lg border border-border p-2.5 text-sm">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">{m.kind} #{m.sequence}</span>
              <span className="text-[11px]">{m.status}</span>
            </div>
            <div className="font-medium">{m.subject}</div>
            {(m.ai_meta as any)?.analysis ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                ✍ {(m.ai_meta as any).analysis.tone} · ~{(m.ai_meta as any).analysis.target_words}w
                {(m.ai_meta as any).analysis.explicit_asks?.length ? ` · answers: ${(m.ai_meta as any).analysis.explicit_asks.slice(0, 2).join("; ")}` : ""}
                {(m.ai_meta as any).analysis.special_instructions ? ` · ⚠ ${(m.ai_meta as any).analysis.special_instructions}` : ""}
              </p>
            ) : null}
            <div className="mt-1 flex items-start justify-between gap-2 rounded bg-muted/30 p-2">
              <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-sans text-xs text-foreground">{m.body}</pre>
              <button onClick={() => copyBody(m.body)} aria-label="Copy draft" title="Copy draft" className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /></button>
            </div>
            {(() => {
              // Body goes out EXACTLY as drafted — no tracked-redirect rewriting. In plain-text
              // email every URL is visible, and /r/<token>?u=link&to=… reads as spam.
              const body = m.body;
              const markSent = () => { if (m.status !== "sent") act("sent", m.id); };
              const isLocal = lead.segment === "local_no_website";
              const waPhone = lead.signal_raw?.waPhone as string | undefined;

              // ── LOCAL "no website" lane → phone/WhatsApp is the channel (OSM gives ~0% email). ──
              if (isLocal && waPhone) {
                const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(body)}`;
                const telUrl = `tel:+${waPhone}`;
                return (
                  <div className="mt-2.5 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={waUrl} data-primary-compose={m.status !== "sent" ? "" : undefined} target="_blank" rel="noreferrer" onClick={markSent} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">
                        <MessageCircle className="h-3.5 w-3.5" /> Send on WhatsApp
                      </a>
                      <a href={telUrl} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                        <Phone className="h-3.5 w-3.5" /> Call {lead.signal_raw?.displayPhone || `+${waPhone}`}
                      </a>
                      {lead.email ? (
                        <a href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(lead.email)}&su=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(body)}`} target="_blank" rel="noreferrer" onClick={markSent} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                          <Mail className="h-3.5 w-3.5" /> Email
                        </a>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-amber-600 dark:text-amber-500">
                      ⚠ Couldn&apos;t confirm they have no site — the message hedges (&ldquo;couldn&apos;t find a website&rdquo;). Glance before sending.
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      {m.status === "sent" ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-green-600"><Check className="h-3.5 w-3.5" /> sent{m.sent_at ? ` · ${new Date(m.sent_at).toLocaleDateString()}` : ""}</span>
                          <button onClick={() => act("unsend", m.id)} className="text-muted-foreground hover:underline">undo</button>
                          <button onClick={() => act("skip")} className="text-red-500 hover:underline">they opted out — don&apos;t contact again</button>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Opening WhatsApp marks it sent — tap &ldquo;undo&rdquo; if you didn&apos;t actually send.</span>
                      )}
                    </div>
                  </div>
                );
              }

              const to = lead.email || "";
              const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(to)}&su=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(body)}`;
              const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(body)}`;
              const primaryHref = isMobile ? mailto : gmailUrl;
              const fallbackHref = isMobile ? gmailUrl : mailto;
              return (
                <div className="mt-2.5 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={primaryHref} data-primary-compose={m.status !== "sent" ? "" : undefined} target={isMobile ? undefined : "_blank"} rel="noreferrer" onClick={markSent} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                      <Mail className="h-3.5 w-3.5" /> Open in {isMobile ? "mail app" : "Gmail"}
                    </a>
                    <a href={fallbackHref} target="_blank" rel="noreferrer" onClick={markSent} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                      {isMobile ? "Gmail web" : "mail app"}
                    </a>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    {m.status === "sent" ? (
                      <>
                        <span className="inline-flex items-center gap-1 text-green-600"><Check className="h-3.5 w-3.5" /> sent{m.sent_at ? ` · ${new Date(m.sent_at).toLocaleDateString()}` : ""}</span>
                        <button onClick={() => act("unsend", m.id)} className="text-muted-foreground hover:underline">undo</button>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Opening marks it sent — tap “undo” if you don&apos;t actually send.</span>
                    )}
                    {m.first_clicked_at ? <span className="text-blue-600">clicked ✓</span> : null}
                    {m.replied_at ? <span className="text-green-600">replied ✓</span> : null}
                    {m.bounced_at ? <span className="text-red-600">bounced</span> : null}
                  </div>
                </div>
              );
            })()}
          </div>
        ))}
        {(t.replies || []).map((r: any) => (
          <div key={r.id} className="rounded-lg border border-blue-300/50 bg-blue-500/5 p-2.5 text-sm">
            <div className="text-xs font-medium">reply · {r.classification} ({r.sentiment})</div>
            <pre className="mt-1 whitespace-pre-wrap break-words font-sans text-xs">{r.raw_text}</pre>
            {r.suggested_followup ? <div className="mt-1.5 rounded bg-muted p-2 text-xs"><b>Suggested:</b> {r.suggested_followup}</div> : null}
          </div>
        ))}
      </div>
      )}

      {/* reply classifier only after a real send (or an existing reply) — not a phantom input on fresh drafts */}
      {((t.messages || []).some((m: any) => m.status === "sent") || (t.replies || []).length > 0) ? (
        <div className="border-t border-border pt-3">
          <p className="mb-1.5 text-xs text-muted-foreground">Got a reply? Paste it to classify + draft a follow-up.</p>
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Paste their reply…" className="h-20 w-full rounded-lg border border-border bg-background p-2 text-sm" />
          <button onClick={classify} disabled={busy || !reply} className="mt-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {busy ? "Classifying…" : "Classify reply"}
          </button>
          {result ? (
            <div className="mt-2 rounded-lg border border-border p-2 text-xs">
              {result.error ? <span className="text-red-500">{result.error}</span> : (
                <>
                  <div><b>{result.classification}</b> · {result.sentiment} · {Math.round((result.confidence || 0) * 100)}%</div>
                  {result.suggested_followup ? <div className="mt-1"><b>Follow-up:</b> {result.suggested_followup}</div> : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
