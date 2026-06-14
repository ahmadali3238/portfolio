/** Shared types for the outreach engine. Mirror the Supabase schema. */

export type Segment = "hiring_signal" | "prospect" | "local_no_website";

export type LeadStatus =
  | "sourced" | "enriching" | "enriched" | "enrich_failed"
  | "drafting" | "drafted" | "approved" | "sending" | "sent" | "send_failed"
  | "replied" | "bounced" | "skipped" | "over_required_experience" | "email_blocked";

/** Normalized lead emitted by every source adapter, before enrichment/persistence. */
export interface RawLead {
  company: string;
  personName?: string | null;
  personTitle?: string | null;
  domain?: string | null;
  linkedinUrl?: string | null;
  segment: Segment;
  source: string;
  sourceUrl?: string | null;
  signal?: string | null;          // human-readable "why this lead"
  signalRaw?: Record<string, unknown>;
  postedAt?: string | null;        // ISO date the job/post was published (if the source has it)
  description?: string | null;     // fuller posting text (plain, capped) for the dashboard
  email?: string | null;           // in-post email if present
  phone?: string | null;           // listed phone (local_no_website lane → WhatsApp/call channel)
  country?: string | null;
  requiredYears?: number | null;   // parsed explicit experience requirement
  stack?: string[];
}

export interface Lead extends RawLead {
  id: string;
  status: LeadStatus;
  statusReason?: string | null;
  score: number;
  geoTier?: number | null;
  geoScore?: number;
  emailStatus?: string | null;
  phone?: string | null;
  dedupeKey: string;
}

export interface OutreachMessage {
  id?: string;
  lead_id: string;
  kind: "initial" | "followup";
  sequence: number;
  subject: string;
  body: string;
  status: "draft" | "approved" | "sending" | "sent" | "failed" | "skipped";
  send_mode?: string;
  compose_url?: string | null;
  tracking_token?: string | null;
  ai_meta?: Record<string, unknown>;
}
