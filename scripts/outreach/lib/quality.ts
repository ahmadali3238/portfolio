/** Email quality gates (deliverability + safety). */

// ── Tier 1: NEVER email these — regardless of source. ────────────────────────
// Some are spam-reporting / system mailboxes where emailing actively HURTS you
// (abuse@ can get you flagged as a spammer); others are no-reply / distribution lists.
const NEVER = new Set([
  "abuse", "spam", "postmaster", "mailer-daemon", "mailerdaemon", "root", "hostmaster",
  "sysadmin", "webmaster", "noreply", "no-reply", "donotreply", "do-not-reply", "donotsend",
  "bounce", "bounces", "unsubscribe", "optout", "opt-out", "newsletter", "newsletters",
  "notifications", "notification", "notify", "alerts", "alert", "updates", "news",
  "security", "privacy", "legal", "compliance", "dpo", "gdpr",
  "all", "everyone", "staff", "employees", "team-all", "list", "lists", "group",
  "undisclosed-recipients", "example", "test", "user", "username",
]);

// ── Tier 2: generic role mailboxes — skip when SCRAPED, but trust if the company
// published them in the job post (in_post). e.g. a hiring lead's jobs@ is fine in-post. ──
const GENERIC_ROLE = new Set([
  "info", "hello", "hi", "hey", "contact", "contactus", "team", "office", "mail", "email",
  "general", "enquiries", "enquiry", "inquiries", "inquiry", "support", "help", "helpdesk",
  "sales", "marketing", "press", "media", "pr", "communications", "comms",
  "hr", "careers", "career", "jobs", "job", "recruiting", "recruitment", "recruiter", "talent",
  "billing", "accounts", "accounting", "finance", "payments", "invoices", "invoice",
  "orders", "order", "service", "services", "customerservice", "customer-service", "cs",
  "care", "customercare", "reception", "frontdesk", "front-desk", "feedback",
  "partnerships", "partnership", "partner", "partners", "affiliate", "affiliates",
  "events", "event", "demo", "reservations", "bookings", "booking", "returns",
  "shop", "store", "hq", "headquarters", "hq-team", "founders", "ceo-office",
]);

// ── Tier 3: throwaway / disposable domains — never real prospects. ───────────
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org",
  "trashmail.com", "yopmail.com", "getnada.com", "throwawaymail.com", "maildrop.cc",
  "sharklasers.com", "dispostable.com", "fakeinbox.com", "mailnesia.com", "mintemail.com",
  "spam4.me", "mvrht.net", "example.com", "example.org", "test.com",
]);

export function localPart(email: string): string {
  return (email || "").split("@")[0].toLowerCase().replace(/\+.*$/, ""); // strip +tags
}
export function domainPart(email: string): string {
  return (email || "").split("@")[1]?.toLowerCase() || "";
}

export function isNeverEmail(email: string): boolean {
  return NEVER.has(localPart(email)) || DISPOSABLE_DOMAINS.has(domainPart(email));
}
export function isGenericRole(email: string): boolean {
  return GENERIC_ROLE.has(localPart(email));
}

/**
 * Should we email this address?
 *  - No address / disposable / NEVER-list → always skip.
 *  - in_post (company-published) generic roles are trusted (e.g. jobs@ for a hiring lead).
 *  - scraped generic roles (info@/hello@…) are skipped: higher bounce, lower reply.
 * (We don't attempt catch-all detection — it isn't reliable for free.)
 */
export function isLowQualityEmail(email: string | null | undefined, emailStatus: string | null | undefined): boolean {
  if (!email) return true;
  if (isNeverEmail(email)) return true;          // dangerous / system / disposable → always skip
  if (emailStatus === "in_post") return false;   // company-published → trust
  return isGenericRole(email);                    // scraped + generic → skip
}
