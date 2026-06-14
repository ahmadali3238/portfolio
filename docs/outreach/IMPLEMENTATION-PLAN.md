# Outreach Engine — Implementation Plan

> An automated, scalable client-acquisition pipeline for Muhammad Abdullah.
> Sources real hiring signals (free) → enriches contacts (BetterContact) →
> personalizes outreach (Claude) → sends safely → tracks replies & follows up.

---

## 1. Goal & constraints

**Goal:** consistently land paying clients for full-stack + AI/agentic development
services, with minimal manual effort and zero risk to the portfolio's reputation.

**Hard constraints (from you):**

| Constraint | How the design honors it |
|---|---|
| **100% free — no paid providers** | BetterContact and Claude (and any paid vendor) are **excluded from the default stack**. Enrichment = free-finder + Prospeo (free 75/mo) + Hunter (free 50/mo). LLM = Groq/Gemini free tier. They remain *optional, off-by-default* adapters you can enable later — but **nothing is required to pay**. |
| Everything else **free** | Supabase free tier (storage + dashboard data), GitHub Actions free cron (compute), keyless public APIs for lead sourcing, Gmail compose links / Gmail SMTP for free sending. |
| **As many emails as possible** under free tier | Volume is capped by *deliverability safety* + free enrichment credits (~125/mo + 29% free-in-post), not by software. The pipeline scales to whatever your sending channel can safely handle (see §6). |
| **No ban risk to the main domain** | The portfolio lives on `*.vercel.app` and never sends mail. Sending is fully decoupled into a separate worker. The portfolio's only role is a read-only insights dashboard. |

> **Net: the entire system requires zero paid API keys.** Claude/BetterContact are wired as
> optional boosters you can switch on later, but the default configuration spends nothing.

**One correction baked into the plan:** you cannot send authenticated email from a
`*.vercel.app` domain (Vercel owns that DNS — no SPF/DKIM/DMARC, no MX). So the
default send mode is **`draft`** (Claude writes the email, you click "Open in Gmail"
and send) — 100% free, zero infrastructure, zero ban risk. An automated `smtp` mode
is built and ready for when you add a cheap dedicated domain (~$1–10/yr), and a
**send-from-dashboard** option (Gmail SMTP via an app password — no domain, no opening
Gmail) sits in between. See §6.

---

## 1.5 Stretching the paid keys (run almost entirely free)

Neither Claude nor BetterContact has a *perpetual* free tier — only signup credits
(Claude: a small one-time credit; BetterContact: trial credits). So we treat both as
**precious** and lean on genuinely-free tiers the repo already has.

**LLM layer = a provider switch (free by default):**

| Task | Default provider | Why |
|---|---|---|
| Draft cold emails | **Groq free tier** (already wired in repo) | High volume, zero cost |
| Classify replies | **Groq free tier** | Cheap, fast |
| Fallback | **Gemini free tier** | Resilience, still free |
| Premium / Tier-1 leads | **Claude (paid) — OFF by default** | Optional; only if *you* enable it |

Controlled by `OUTREACH_LLM_PROVIDER` (default `groq`) and `OUTREACH_LLM_PREMIUM_PROVIDER`
(default `gemini` — free). Claude is **not used unless you explicitly set a provider to
`anthropic`**. All drafting therefore costs **₨0**.

**Conserving BetterContact credits — free email-finder runs *first*:**

```
lead → [1] email already in the post?      → use it      (free)
     → [2] scrape /contact /team /about     → found?      (free)
     → [3] pattern guess + MX/SMTP verify    → confident?  (free)
     → [4] BetterContact waterfall  ← only high-score leads still missing an email (paid)
```

Plus a hard cap `BETTERCONTACT_MONTHLY_CREDIT_CAP` so credits can never be blown in one
run. **Reality check:** free email-finding is unreliable (Google blocks SMTP probing,
catch-all domains defeat pattern verification), so realistic free hit-rate is ~20–40% —
**BetterContact remains the workhorse, not a rare last resort.** The finder reduces credit
burn *meaningfully but variably*; budget credits as if most good leads still need it.

**Result:** the pipeline runs almost entirely free; paid credits are spent only on your
best, highest-budget leads.

---

## 1.6 Enrichment — the verified free reality (corrected)

**Researched & corrected (June 2026):** the popular email-finder free tiers do **NOT**
expose an API — Prospeo, Hunter, and Apollo all gate API + automated enrichment behind
**paid** plans; their free tiers are manual (web app + Chrome extension) only. **Creating
multiple accounts to multiply free credits is explicitly prohibited** and triggers
permanent suspension. So there is no "stack of free finder APIs" and no safe "rotate free
keys weekly." (Sources in §13.)

What is genuinely **free + automated + ToS-safe**, run as an ordered waterfall via
`OUTREACH_ENRICH_PROVIDERS`:

| Order | Provider | Cost | Proven? | Role |
|---|---|---|---|---|
| 1 | **in-post email** | ₨0 | ✅ **29% measured** | email already in the job post — parsed during sourcing |
| 2 | **free-finder** | ₨0 | ✅ **PoC live** | scrape `/contact` `/team` `/about` for published emails + MX check (worked on kanary/starbridge/goshop) |
| 3 | **manual-csv** | ₨0 | n/a | *you* run Prospeo/Hunter's free **extension + filters** on top leads → export CSV → pipeline ingests (`source: manual`) |

- **Default:** `OUTREACH_ENRICH_PROVIDERS=inpost,freefinder` — 100% automated & free.
- **Optional paid (off):** add `prospeo`/`hunter`/`bettercontact` ONLY if you ever buy
  their API plan. Adapters exist but are excluded by default.
- If all free steps miss → lead flagged `enrich_failed` → routed to LinkedIn/manual or the
  manual-csv lane. Never blocks the pipeline.
- **Honest hit-rate:** strong for small startups (our HN ICP, which publish contact
  emails); weak for big companies that hide them. Reserve the manual-csv lane for your
  highest-value 10–20 leads/week.
- **Volume math:** in-post (~29%) + free-finder + a small manual lane comfortably covers
  the dozens/week you can safely *send* for free anyway — enrichment is not the bottleneck.

This means BetterContact is a **nice-to-have, not a dependency** — your only hard-required
paid key becomes... none (Groq/Gemini free covers the LLM too; Claude is also optional).

---

## 2. High-level architecture

A **decoupled state-machine pipeline**, modeled on your existing *Reply Intelligence*
project. Each lead is a row that walks through statuses; each stage is an idempotent,
re-runnable script.

```
SOURCE (free)            ENRICH (BetterContact)   DRAFT (Claude)         SEND (pluggable)        FOLLOW-UP (Claude)
─────────────            ──────────────────────   ──────────────         ────────────────        ──────────────────
HN "Who is Hiring" ┐                               personalized       ┌─ draft  (free, 0-risk)   reply pasted/imported
RemoteOK           ├─► company + person ─► email ─► email per lead ──► ├─ smtp   (your domain)   ─► classified by Claude
We Work Remotely   ┤    + signal           +phone    (your real          └─ export (CSV)            ─► tailored follow-up
YC directory       ┘                               proof points)                                     (auto or manual)

            ▼ all state persisted in Supabase (free tier) ▼
   Admin dashboard on the portfolio (read + approve only) — never sends, never at risk
```

**Two halves, deliberately isolated:**

1. **Worker** (`scripts/outreach/*`) — standalone `tsx` scripts run by a *separate*
   GitHub Actions cron. Does the sourcing, enrichment, drafting, sending, follow-ups.
2. **Dashboard** (`src/app/admin/outreach/*`) — admin pages in the portfolio that
   *read* Supabase and let you approve/skip drafts and classify replies. It issues no
   outbound email, so the portfolio domain is never in the sending path.

---

## 3. Data model (Supabase)

Migration: `supabase/migrations/202606100001_create_outreach_system.sql` (already written).
RLS is on for every table with **no public policies** — only the service-role key
(scripts + admin) can read/write.

| Table | Purpose | Key columns |
|---|---|---|
| `outreach_leads` | one row per prospect, walked through the pipeline | `status`, `score`, `dedupe_key` (unique), `company_name`, `person_name`, `email`, `signal`, `source` |
| `outreach_messages` | initial email + each follow-up | `lead_id`, `kind` (initial/followup), `sequence`, `subject`, `body`, `status`, `send_mode`, `compose_url` |
| `outreach_replies` | inbound replies classified by Claude | `lead_id`, `classification`, `sentiment`, `suggested_followup`, `handled` |
| `outreach_events` | per-run pipeline log (observability) | `stage`, `status`, `processed/succeeded/failed` |

**Lead status machine:**

```
sourced → enriching → enriched → drafting → drafted → approved → sending → sent → replied
   │           │                                 │                    │
   │           └─► enrich_failed                 └─► (skipped)         └─► send_failed / bounced
   └─► (deduped: dropped before insert)
```

---

## 4. Lead sourcing (free, keyless)

BetterContact is **enrichment, not prospecting** — it turns `name + company` into a
verified email. So we need a free layer that decides *who* to contact. We use sources
where the buying signal is strongest: **companies actively hiring for your exact stack**
(React / Next.js / Node / TypeScript / AI / LLM / agents). A live job post = a real
need + a real budget, right now.

| Source | Access | Why it fits | Notes |
|---|---|---|---|
| **HN "Who is Hiring"** | HN Algolia API (free, no key) | Monthly thread full of startups listing exact stacks & contact emails | Highest signal. Often includes a direct email in the post. |
| **RemoteOK** | `remoteok.com/api` + `?tags=react` (free JSON) | Remote-first companies hiring devs | Has company, role, tags, sometimes apply URL/domain. Tags are spammy → kept out of the keyword gate (signalRaw only). |
| **We Work Remotely** | RSS feeds ×3 (free): full-stack, front-end, back-end | Remote dev/full-stack roles | Parse company + role from feed items. Back-end feed verified zero-overlap with the other two. |
| **YC directory** ✅ tested | `yc-oss.github.io/api` static JSON (free, no key) | Funded startups likely to need AI/full-stack help | **Proven: 5,955 companies, 2,491 AI-tagged.** Company + domain; person via enrichment. |
| **Himalayas** ✅ tested (June 2026) | `himalayas.app/jobs/api/search?q=…&sort=recent` (free, no key, 20/req cap) | Remote jobs with STRUCTURED seniority[]/locationRestrictions[]/employmentType | ~10–20 fresh relevant/night across 5 queries. No email/domain fields → enrichment resolves from company name. Data refreshes daily — nightly poll is the intended cadence. |
| ~~Reddit r/forhire~~ ⚠️ | Reddit JSON | "[Hiring]" gigs | **Tested: 403 from datacenter IPs.** Needs a free Reddit OAuth app (and may need residential IP). Deferred / behind a flag. |
| ~~Wellfound~~ ❌ | — | startups hiring | **Tested: 403 Cloudflare-blocked.** Not viable free/automated → manual lane only. |
| ~~Indie Hackers~~ ⚠️ | — | solo founders (`prospect`) | **Tested: no clean API** (HTML only); fragile scraping. Deferred. |
| **Local businesses (OSM)** ✅ built (June 2026) | Overpass API (free, **no key, no card**) | Local businesses **with no website yet** → pitch a FREE basic site (paid extras) | Segment `local_no_website`. Phone-required, no-website-tag, tier-1 city cores × beauty/health/food/trades. Channel = **WhatsApp/phone** (OSM email ~0%). See §4e. |

> **Tested live (June 2026):** HN ✅, RemoteOK ✅ (100 jobs), We Work Remotely ✅ (52 items),
> YC ✅ (5,955 cos), Himalayas ✅ (search API verified). Reddit/Wellfound/Indie Hackers are
> **blocked or API-less** from automated hosts — kept as deferred/manual, not core.
>
> **Re-audited June 13, 2026** (live verification of every candidate free source):
> Remotive (static 27-job snapshot, params ignored, ToS bans email collection), Jobicy
> (41/50 senior FT, agency-dominated), Arbeitnow (~100% Germany = opt-in-only, filters
> broken), Working Nomads (fixed 50-item promo feed, Proxify/Lemon.io marketplaces), and
> the HN "Freelancer? Seeking freelancer?" thread (official bot dead since Oct 2025;
> ~1 demand post/month, 0 stack-relevant in 6 months) — all **skipped on evidence**.

### 4a. Two segments (different playbooks)

Each lead is tagged `segment`:

- **`hiring_signal`** — they posted a role we match. Warm. Pitch angle: *"I saw you're
  hiring for X — I've shipped exactly that (Navero/Creator AI). Worth a quick chat before
  you commit to a full-time hire?"* Sources: HN, RemoteOK, WWR.
- **`prospect`** — **not hiring, but likely needs the service.** Pitch angle: *"I built
  X for companies like yours — here's a concrete idea for you."* Sources: YC/Product Hunt
  launches (new products = need build help), funded startups with thin/dated sites, local
  agencies & SMBs (OSM). This is the "people who aren't hiring but might want my services"
  bucket you asked for — it dramatically widens the funnel.
  - **Activated June 14, 2026 (ban-safe by design).** Prospects can't earn the +10 active-need
    bonus or an in-post email (+15), so they cap lower than hiring leads and were silently
    filtered by the shared `minScore=55` (0 drafted of 519). They now get their OWN lower bar
    (`prospectMinScore=40`) and bypass the job-only experience/seniority gate, with a small
    per-run cap (`maxProspectLeadsPerRun=5`). **Why this is safe from sender-reputation bans:**
    (1) same EMAIL channel + manual draft-mode send as the hiring lane — no new sending mechanism;
    (2) volume stays low — 5 sourced/night, and the enrich stage only drafts a prospect when a
    **real, non-generic** email is found on its site (scraped `info@`/`hello@` are dropped), so
    most attempts never become a send; (3) the AI gauntlet rejects non-fits; (4) `dailySendLimit`
    caps total manual sends/day across all lanes; (5) opt-out in every footer + dedupe prevents
    repeat contact; (6) opt-in-only countries stay `email_blocked`. Lives forward off the ~950
    un-sourced YC pool (1471 relevant total) — no backlog surgery.

### 4b. Geo prioritization (chase the budget)

Generic "best country" lists rank where to *hire cheap devs from* — that's you. We invert
it: target where the **buyers with budget** are. Each lead gets a `geo_tier` + `geo_score`:

Geo tiers are **gated by cold-email legality**, not just budget (see §13 for the law):

| Tier | Markets (cold-email OK: opt-out regime) | Weight |
|---|---|---|
| **1** | 🇺🇸 US, 🇬🇧 UK, 🇨🇦 Canada, 🇦🇺 Australia, 🇦🇪 UAE, 🇳🇱 Netherlands, 🇮🇪 Ireland, 🇫🇷 France, 🇸🇪 Sweden, + any "remote-worldwide" company | **+** big boost |
| **2** | Singapore, Nordics (rest), Switzerland, Saudi/Qatar, NZ, Israel | small boost |
| **⛔ low-budget / weak-currency (excluded entirely)** | India, Pakistan, Bangladesh, Sri Lanka, Nepal, Nigeria, Egypt, Kenya, Ghana, Ethiopia, Tanzania, Uganda, Indonesia, Philippines, Vietnam, Cambodia, Myanmar, Ukraine, Argentina, Venezuela, Bolivia, Nicaragua, Honduras, Iran, Lebanon, Zimbabwe (and similar) | **hard-excluded** — weak local currency → unviable budgets/margins. Never sourced, enriched, or emailed. **Editable** via `OUTREACH_EXCLUDE_COUNTRIES` (remove any you still want to target) |
| **⛔ cold-email-restricted (opt-in required)** | 🇩🇪 Germany, 🇪🇸 Spain, 🇮🇹 Italy, 🇵🇱 Poland, 🇦🇹 Austria, 🇧🇪 Belgium | **excluded from email** — route to LinkedIn/manual only |

UAE is specifically boosted — ~1h timezone gap from Pakistan, booming AI scene, hires
Pakistani devs readily. **Note:** these markets have *budget* but require opt-in consent,
so emailing them risks fines (German *Abmahnung*) — they're flagged `email_blocked` and
surfaced for LinkedIn outreach instead. Country is inferred from the post's location field
/ remote tag / domain TLD (a **noisy heuristic**), confirmed by enrichment when available.
Hard filters: `OUTREACH_TARGET_COUNTRIES` / `OUTREACH_EXCLUDE_COUNTRIES`.

### 4c. Per-source pipeline

fetch → normalize to a `RawLead` → tag `segment` → infer `country` + `geo_tier`
→ **keyword-filter** (word-boundary match on the full posting — substring matching let
"ai" hit "email"/"available" and passed 31% junk, measured live) → **experience +
seniority gate** (4d) → **staleness gate** (`maxPostAgeDays`) → **score 0–100** (stack +
geo + segment + email + recency, onsite-only penalized) → drop below `OUTREACH_MIN_SCORE`
→ **dedupe** (normalized company+person key) → insert as `sourced`.

### 4d. Experience + seniority gate (don't apply where you're under-qualified)

`OUTREACH_YEARS_EXPERIENCE=3` (your current ~3+ yrs). **v2 (June 13, 2026 — rebuilt after a
live audit showed v1 detected years in 0/432 leads):** the parser scans the **full posting**
(title + description, where requirements actually live) and only counts a years-figure when
its context marks it as a requirement — "5+ years of React", "Engineer (7+ yrs)", "BS + 7
years", "minimum 4 years experience" count; "founded 10 years ago", "5 years of runway",
"sabbatical every 5 years", "team with 15+ years of experience" don't. Ranges take the lower
bound; multiple requirements take the max.

| Post says | Action |
|---|---|
| Explicit requirement **>** your years (e.g. "5+ yrs") | **Skipped** → status `over_required_experience` (never emailed) |
| Explicit requirement **≤** your years | Included |
| **No experience requirement mentioned** | Included (the common case) |
| Staff / Principal / Head-of / Director / VP / Architect / Eng-Manager **title** | **Always skipped** (`senior_title:hard`) — regardless of stated years |
| "Senior"/"Lead Eng" title with **no number** | **Skipped by default** (`OUTREACH_SKIP_UNNUMBERED_SENIOR`, now default `1`); included if the stated years fit (some companies call 3 yrs "senior") |
| "Member of Technical Staff" / posts also welcoming juniors/mid-level | **Not** treated as senior (measured false-positive classes) |

Also: posts older than `OUTREACH_MAX_POST_AGE_DAYS` (default 30) are rejected as
`stale_post` — WWR's feed carried items up to 761 days old. Parsing is a context-aware
heuristic; when unsure it **includes** (fail-open) so you don't lose good leads. The skipped
ones still appear in the dashboard (filterable), each with its `status_reason`, and the
nightly digest shows the per-reason filter counts.

### 4e. Local "no website" lane (segment `local_no_website`, built June 2026)

A second playbook entirely: find **local businesses that have no website yet** and offer to
build them a **free basic site** (paid only for later enhancements — booking/ordering, custom
domain + email, SEO). Source is **OpenStreetMap Overpass API** (`lib/sources/osm.ts`) — free,
**no key, no credit card**, ToS-clean (ODbL; internal lead-gen use is fine with attribution if
republished). Google Places/Maps was **rejected**: even the free tier needs a credit-card
billing account, returns 0% email, and its ToS §3.2.3 prohibits storing place data for cold
outreach (account-termination risk).

**Two realities of the data shaped the whole lane** (verified live):

1. **OSM businesses have phone (12–36% in good categories) but ~0% email.** So the channel is
   **WhatsApp / phone**, not email. We query `[~"^(phone|contact:phone)$"~"."]` so every lead is
   contactable, normalize the number to `wa.me` form (`toWaPhone()`), and the dashboard shows
   **"Send on WhatsApp" + "Call"** buttons (and Email only if one is later found). Nothing is
   auto-sent — same manual, draft-mode discipline as the email lane.
2. **A missing OSM `website` *tag* ≠ no website** (tag sparsity is huge — Dubai shows 96%
   untagged). So `enrich.ts` re-verifies cheaply (`lib/enrichment/local-verify.ts`: guess a few
   domains from the name → DNS + HTTP + name-token match). A confirmed live site → **reject
   `has_website`** (the pitch would be wrong). Otherwise the pitch **HEDGES** ("I couldn't find a
   website for you…") so it still reads fine even if they do have one we didn't find.

**Gates:** local leads **bypass** the job-post gates (keyword/experience/seniority/staleness —
a barber never says "react" and has no "required years") but still respect the **geo** gate, a
**chain/franchise** drop (McDonald's etc. already have sites), the **AI gauntlet** (a local
variant that rejects chains, non-businesses like ATMs/public toilets, and obvious large web
presences), and **dedupe** (keyed on company **+ city**, so the same name in two cities is two
leads and a re-query is idempotent). Scoring is a separate axis (`scoreLocalLead`):
contactability (phone) + storefront completeness (address/hours) + category fit
(beauty/health convert best). The lane has its **own per-run cap** (`maxLocalLeadsPerRun=8`)
so it never crowds out — or gets crowded out by — job leads on the shared daily-send budget.

**Coverage:** tier-1 city cores (London, Toronto, NYC, SF, Sydney, Dublin, Amsterdam, Paris,
Stockholm, Dubai) × categories (salon/beauty, dental/clinic, restaurant/café, trades/craft),
rotated nightly via a `{ i }` cursor (`OUTREACH_OSM_QUERIES_PER_RUN=5`, ~3.5s apart, identifying
User-Agent — ~0.1% of Overpass's fair-use allowance). Verified live: 65 real no-website London
salons in one query. Fallback endpoints: `overpass.private.coffee`, `maps.mail.ru`.

---

## 5. Personalization & replies (Claude)

- **Personalization** (`personalize.ts`): the LLM receives (a) your profile/value-prop
  + the **2–3 most relevant proof projects auto-selected for *this* lead** (e.g. an AI
  hiring startup gets Navero; an F&B brand gets Creator AI), (b) the lead's signal
  (their job post / product / stack), and (c) the `segment` (so a `prospect` gets the
  "here's an idea for you" angle, not the "I saw you're hiring" angle). It returns a
  tight, specific email — references *their* need, cites *your* matching project, one
  low-friction CTA. JSON output `{ subject, body }`, validated with Zod.
  - **Every email is unique — not a template.** The prompt forbids boilerplate, and an
    **anti-duplication guard** compares each new draft against recent ones (similarity
    check); too-similar drafts are regenerated with a different angle. No two prospects
    get the same message.
  - **Provider:** **Groq free tier** (Gemini free as fallback) — fully free. Claude is an
    optional, off-by-default booster (see §1.5). Model via `OUTREACH_LLM_MODEL`.
  - **Mandatory compliance footer (all send modes, non-negotiable):** every outgoing email
    appends your name, a real postal address, and a one-click opt-out line (CAN-SPAM / EU
    opt-out law). A **suppression list** (anyone who opts out, bounces, or says "no") is
    always checked before sending. Restricted-country leads are never emailed. See §13.

### 5a. What every email contains (deterministic rules, not left to the LLM)

These are enforced in code after the LLM writes the body — so they're guaranteed, consistent,
and deliverability-safe (we cap total links to avoid spam scoring):

| Element | Rule |
|---|---|
| **Portfolio URL** | **Always included** (`https://abdullahfalak007.vercel.app`) — in the signature, every email, no exception. Sent as a **tracked first-party link** so a click is logged (see §6.7). |
| **Booking link** | **Always included** — a free **Cal.com** (or Google Calendar) link so interested leads self-schedule a call. Removes back-and-forth; big conversion lift. Config `OUTREACH_BOOKING_URL`. |
| **Social links** | **Conditional** — only the ones the job post *explicitly asks for* are added (parse JD for "GitHub", "LinkedIn", "Upwork", "portfolio", "YouTube" → include exactly those, from your known profile URLs). Avoids link-spam; if none requested, only the portfolio URL shows. |
| **Resume / CV** | **When demanded** — if the post says "send your resume/CV", the sender **attaches your static `resume.pdf`** (you drop it in `scripts/outreach/assets/`). Default elsewhere = a **resume *link*** (better deliverability than an attachment). |
| **Cover letter** | **When demanded** — if "cover letter" is requested, Claude/Groq generates a tailored one-pager rendered to PDF (`@react-pdf/renderer`, already in the repo) and attaches it. |
| **Compliance footer** | Always (name, postal address, opt-out). |

Detection uses keyword matching on the post text (`resume`, `cv`, `cover letter`, plus social
names). Attachments fire **only** when explicitly requested — unsolicited attachments hurt
deliverability and read as spam. Config: `OUTREACH_RESUME_PATH`, `OUTREACH_RESUME_URL`,
`OUTREACH_ATTACH_WHEN_DEMANDED=1`, `OUTREACH_SOCIAL_LINKS` (your profile URLs map).

### 5b. Prospect-segment tone (built to convert)

For `segment=prospect` (not hiring, but a fit), the prompt switches to a **value-first,
consultative, low-pressure** angle proven to convert cold prospects: lead with a *specific
observation about them* → a *concrete idea/improvement* you'd build → brief social proof
(the matching project) → a soft CTA ("worth a 10-min look?"). No "I see you're hiring"
language, no hard sell. The goal is to start a conversation, not pitch a contract.
- **Auto-ingest replies via Gmail IMAP** (`imap.ts`, **free, PoC-proven**): the worker polls
  your Gmail inbox over IMAP (free, no API cost — proven with Node's built-in `tls`, no
  library) and matches each incoming message to a lead (by
  sender/thread/`tracking_token`), stores it, and **auto-runs classification** — no manual
  pasting. This also detects **bounces** (mailer-daemon) → marks `bounced` + suppresses.
  Manual paste stays available as a fallback. Config: `GMAIL_IMAP_USER`, reuses
  `GMAIL_APP_PASSWORD`, `OUTREACH_IMAP_POLL=1`.
- **Reply classification** (`classify.ts`): Claude/Groq labels each reply
  (`interested`, `meeting_request`, `objection`, `not_now`, `not_interested`,
  `referral`, `auto_reply`, `unsubscribe`, …), scores sentiment, and **drafts a
  tailored follow-up** for your one-click approval. This is *Reply Intelligence*-lite.
- **Follow-up sequences** (`followup.ts`) — *the single biggest free lever* (~50%+ of
  replies come from follow-ups). A multi-step cadence (`OUTREACH_FOLLOWUP_DAYS=3,7,14`),
  each a short, *new-angle* bump (not a copy) referencing the original; stops the instant a
  reply/opt-out arrives. Manual-approve by default; `OUTREACH_AUTO_FOLLOWUP=1` for hands-free.
- **A/B subject testing** (free): the LLM generates 2–3 subject variants per lead; we record
  which variant gets **replies** (never open-pixels — those hurt deliverability) and bias
  future sends toward the winner. Stored in `ai_meta`.

**Cost (your Claude key):** a personalized email ≈ a few hundred output tokens. At Haiku
prices this is roughly **$0.001–0.003 per email** — hundreds of leads cost a few cents.
Reply classification is even cheaper.

---

## 6. Sending strategy (the honest part)

> **"Free + high-volume + safe + good deliverability" cold email is mutually exclusive.**
> The pipeline gives you three modes so you choose the trade-off — and your *main domain
> is safe in all three.*

| Mode | Cost | Volume | Risk | When to use |
|---|---|---|---|---|
| **`draft`** *(default)* | Free | ~unlimited drafts, you send by hand | **Zero** | Start here. Claude writes it, dashboard gives an "Open in Gmail" compose link; you review + send. Best reply rates while validating messaging. |
| **`gmail`** *(send without opening Gmail)* | Free | ~Gmail limits (~hundreds/day, go slow) | Low — affects your *Gmail* reputation, **never the portfolio domain** | A **"Send" button in the dashboard** fires the email via Gmail **SMTP + an app password** — no domain, no opening the Gmail app. Best free middle ground. Keep volume modest & personalized. |
| **`smtp`** | ~$1–10/yr (one dedicated domain) | Safe ~20–50/day/inbox, scale with more inboxes | Low (on the *separate* domain only) | When messaging is proven and you want real automation/scale. Needs SPF/DKIM/DMARC on a NON-portfolio domain + warmup. |
| **`export`** | Free | Bulk CSV | Zero (you send elsewhere) | Upwork / LinkedIn / Wellfound manual outreach. |

> **"Send without opening Gmail"** = the `gmail` mode. You generate a Gmail **app
> password** once, drop it in config, and the dashboard's **Send** / **Send all approved**
> buttons deliver straight through your Gmail. Because the `From` is your Gmail (or later a
> side domain), **your portfolio's `vercel.app` domain is structurally never in the
> sending path — it cannot be flagged.** The only reputation at stake is the sending
> mailbox itself, which is why volume stays modest and every email stays personalized.

**Why volume is capped by safety, not code:** any mailbox sending cold email too fast
gets throttled/flagged by Gmail/Outlook. Real scale comes from *multiple low-volume
sending domains/inboxes with warmup* — not from blasting one inbox. The `smtp` adapter
is built to round-robin inboxes when you add them, so scaling later is config, not code.

**Deliverability checklist (for when you go `smtp`):** dedicated domain (not the
portfolio) → SPF + DKIM + DMARC records → 2–4 weeks warmup → ≤30–50/day/inbox →
plain-text, 1 link max, real unsubscribe line → monitor bounce/spam rate.

---

## 6.5 Admin dashboard — your control room (`/admin/outreach`)

A full UI inside your portfolio's existing admin area (protected by your current admin
auth). It **reads and controls** the pipeline but **never sends from the portfolio
domain** — sends go through the Gmail/SMTP path. What it gives you:

**Overview / insights**
- KPI cards: leads sourced, enriched, drafted, sent, replied, **reply rate**, meetings,
  BetterContact credits used vs. cap, LLM spend (free vs. paid).
- Funnel chart (sourced → … → replied) and trends over time (reuses the existing
  Recharts setup from the blog analytics dashboard).
- Breakdown by **source**, **segment** (hiring vs prospect), and **country/geo-tier** —
  so you can see which markets actually reply.

**Leads list (as implemented)**
- Card list with score + status/source/country/segment badges; filter chips per status.
- **"to review"** filter (first chip, with count): every lead with a pending draft —
  including follow-up drafts on already-`sent` leads.
- Per draft: **Open in Gmail** (desktop popup) / **Open in mail app** (mobile native) —
  opening **auto-marks it sent** (with *undo*); **skip** discards a lead; **approve**
  exists for the future auto-send mode.
- *(Planned, not built: inline draft editing, regenerate-with-new-angle, bulk approve.)*

**Conversation view (per lead) — visualize past & ongoing threads** ⭐
- Click any lead → a **chat-style timeline**: your initial email, follow-ups, and the
  prospect's replies, in order, with timestamps and status (sent / opened-if-tracked /
  replied). Data comes from `outreach_messages` + `outreach_replies` joined by `lead_id`.
- Inline **reply classifier**: paste the prospect's reply → Claude labels it + drafts the
  next message right there → you edit → **Send**. The whole back-and-forth lives in one
  scrollable thread, so you always see the full history of every conversation.

**Settings panel**
- Toggle send mode (draft/gmail/smtp/export), LLM provider (free/premium), daily caps,
  target/exclude countries, min score, auto-followup on/off — without redeploying.

---

## 6.6 Monitoring & failure alerts (know the moment anything breaks)

Reuses the portfolio's **existing** admin-notification system (the blog engine already has
`admin_notifications` table + `src/lib/notifications/dispatcher.ts` + an admin bell UI), so
this is wiring, not new infrastructure.

**Every stage is wrapped** — a thrown error never silently dies:

- **Run log:** each stage writes an `outreach_events` row (`stage`, `status`,
  `processed/succeeded/failed`, `message`). The dashboard shows the last run per stage with
  a 🟢/🔴 indicator and the error text.
- **Alert on failure (implemented):** failures are never silent, two ways:
  1. The orchestrator **exits non-zero** if any stage failed → the GitHub Actions run goes
     **red** and GitHub emails you a workflow-failure notice (works even if Supabase itself
     is down).
  2. The daily digest checks `outreach_events` for failures in the last 26h and **sends a
     ⚠️ failure digest even when there are 0 drafts** (normal skip-on-quiet only applies
     when there are no failures). Failed stages + error messages are listed in the email.
- **Health signals tracked:** source fetch failures, enrichment hit-rate drop, 0 leads in a
  run, send errors/bounces, daily-cap reached, GitHub Action failed (Actions emails you by
  default too).
- **Daily digest (optional):** one summary notification — leads sourced/sent, replies,
  failures — so silence = "all good," and you only get pinged when attention is needed.
- **Severity levels:** `info` (digest), `warning` (a source down, others fine), `critical`
  (whole run failed / auth/key invalid).

Net: you never have to babysit it. If something breaks, it tells you where and why.

---

## 6.7 Who received / opened / replied — tracking (free, honest)

A per-message tracking ladder, stored in `outreach_messages` (denormalized columns) +
`outreach_engagement` (granular events). Shown in the dashboard and the conversation thread.

| Signal | How (free) | Reliability |
|---|---|---|
| **Sent** | SMTP `250 OK` on send | 🟢 exact |
| **Received / Delivered** | sent OK **and** no bounce seen via IMAP within a window | 🟢 strong (bounce = not delivered) |
| **Bounced** | IMAP detects mailer-daemon → mark `bounced` + suppress | 🟢 exact |
| **Engaged (clicked / visited)** | **first-party tracked links** → click hits your own site → logged | 🟢 reliable, deliverability-safe |
| **Opened** | optional 1×1 tracking pixel | 🟠 **OFF by default** — pixels hurt deliverability & Gmail/Apple proxy-load them (false opens). Toggle `OUTREACH_OPEN_PIXEL=1` only if you accept the trade-off |
| **Replied** | IMAP reply matched to lead (§5) | 🟢 exact |

> **Recommendation:** rely on **click/visit + reply** (both first-party, free, accurate) as
> your engagement truth; leave the open-pixel off. You still see exactly *who received it*
> (sent − bounced), *who engaged* (clicked your link / hit their landing page), and *who
> replied* — without the spam penalty of pixels.

## 6.8 Per-lead landing pages (free, doubles as click tracking)

On your existing Next.js site: a dynamic route **`/for/[company]`** renders a tiny tailored
page (their name + a one-line pitch + the single most relevant project + your booking link).
Email links point to a **tracked redirect** `/r/[token]` → logs the click in
`outreach_engagement` → 302s to the landing page. Two wins from one feature: a **higher-
converting destination** than a generic homepage, and **reliable first-party engagement
tracking** (no pixel). Costs nothing — it's your own hosting. Lead/company data already in
Supabase; pages are `noindex` so they don't affect SEO.

## 6.9 Send-time optimization (free)

We already infer each lead's country/timezone. The sender queues messages to go out during
the **prospect's business hours on weekdays** (not nights/weekends), which lifts open/reply
rates and looks human. Reuses the probability/active-hours idea from the blog scheduler.
Config: send window via `OUTREACH_SEND_LOCAL_HOURS=9-17`.

## 6.10 LinkedIn lane (free, for the leads email can't touch)

For leads that are `email_blocked` (opt-in-only countries like Germany) or `enrich_failed`
(no email found), the system generates a **tailored LinkedIn connection note + first DM**
and drops them in an export the dashboard surfaces, so you send them by hand. Keeps those
high-value leads in play without legal risk or wasted enrichment.

---

## 7. Free-tier budget

| Resource | Free tier | Pipeline usage | Headroom |
|---|---|---|---|
| Supabase | 500MB DB, 50k MAU | a few KB/lead, no end users | massive |
| GitHub Actions | 2,000 min/mo (private) | a few min/run, a few runs/day | fine |
| Lead-source APIs | keyless public | polite, cached, rate-limited fetches | fine |
| Gmail (draft mode) | free account | you click send | n/a |
| **Paid:** Claude | your key | ~$0.001–0.003/email | your call |
| **Paid:** BetterContact | your key | per verified email credit | your call |

---

## 8. Module / file layout

```
supabase/migrations/
  202606100001_create_outreach_system.sql      ✅ done

scripts/outreach/
  lib/
    config.ts            # env loaders (reuse blog-config pattern)
    supabase.ts          # REST repository for outreach_* tables (copy blog repo pattern)
    profile.ts           # Abdullah's pitch: services, proof projects, tone
    llm.ts               # provider switch: groq | gemini (free) | anthropic (paid)
    anthropic.ts         # Claude client (error class, config check, retry, JSON)
    # (groq.ts / gemini.ts already exist in src/lib/blog — reused via llm.ts)
    enrichment/
      types.ts           # EnrichProvider contract (hasConfig, find, monthly cap)
      inpost.ts          # FREE: use the email already parsed from the source post
      free-finder.ts     # FREE: /contact+/team+/about scrape + MX check (PoC-proven)
      manual-csv.ts      # FREE: ingest Prospeo/Hunter extension CSV exports (top leads)
      prospeo.ts         # OPTIONAL paid API ($39/mo+) — off by default
      hunter.ts          # OPTIONAL paid API — off by default
      bettercontact.ts   # OPTIONAL paid API — off by default
      index.ts           # ordered waterfall runner (OUTREACH_ENRICH_PROVIDERS)
    geo.ts               # country inference + tier/score (US/UAE/UK/EU boost, etc.)
    scoring.ts           # 0-100 relevance (stack + geo + segment + recency)
    dedupe.ts            # normalized dedupe keys + fuzzy guard + anti-duplicate drafts
    sources/
      types.ts           # RawLead interface (incl. segment) + Source adapter contract
      hn.ts              # Hacker News "Who is Hiring"      (hiring_signal)
      remoteok.ts        # RemoteOK JSON                    (hiring_signal)
      wwr.ts             # We Work Remotely RSS             (hiring_signal)
      reddit.ts          # r/forhire, r/jobbit JSON         (hiring_signal)
      yc.ts              # YC company directory             (prospect)
      wellfound.ts       # Wellfound listings               (hiring_signal)
      indiehackers.ts    # Indie Hackers feed               (prospect)
      producthunt.ts     # Product Hunt launches            (prospect)
      index.ts           # registry + runner
    experience.ts        # parse required years → qualify/skip (§4d)
    personalize.ts       # LLM → { subject, body[, variants] }, segment-aware, anti-template
    email-content.ts     # deterministic rules: portfolio + booking always, conditional socials, attachments (§5a)
    classify.ts          # LLM → reply classification + suggested follow-up
    imap.ts              # poll Gmail IMAP → ingest replies + detect bounces (§5)
    tracking.ts          # build tracked links / tokens; record engagement events
    sender/
      index.ts           # adapter switch: draft | gmail | smtp | export
      draft.ts           # Gmail compose-URL builder (manual send)
      gmail.ts           # nodemailer via Gmail SMTP + app password (dashboard Send button)
      smtp.ts            # nodemailer via dedicated domain (scale)
      export.ts          # CSV writer
  source.ts              # CLI: discover + insert leads
  enrich.ts              # CLI: sourced → BetterContact → enriched
  draft.ts               # CLI: enriched → Claude → drafted
  send.ts                # CLI: approved → send (mode-aware) → sent
  followup.ts            # CLI: stale sent → Claude bump → drafted follow-up
  pipeline.ts            # orchestrator: runs all stages with caps + DRY_RUN

src/app/admin/outreach/
  page.tsx               # dashboard (server, requireAdminSession)
src/components/admin/
  OutreachDashboard.tsx  # leads table, drafts approval, reply classifier, stats
src/app/api/admin/outreach/
  route.ts               # GET leads/messages/stats
  approve/route.ts       # approve/skip a draft
  classify/route.ts      # paste a reply → classify + draft follow-up

src/app/                 # public (free) tracking + landing — first-party, deliverability-safe
  for/[company]/page.tsx # per-lead tailored landing page (noindex) (§6.8)
  r/[token]/route.ts     # tracked redirect: log click → 302 to destination
  px/[token]/route.ts    # OPTIONAL 1x1 open pixel (off by default) (§6.7)
api/outreach/
  reply-webhook/route.ts # (optional) inbound reply hook; IMAP poller is the default

.github/workflows/
  outreach.yml           # source/enrich/draft/send/followup cron (isolated)
  outreach-imap.yml      # reply/bounce IMAP poller cron

docs/outreach/
  IMPLEMENTATION-PLAN.md # this file
  plan.html              # plain-English overview + flow diagram
```

---

## 9. Build phases (milestones)

| # | Phase | Deliverable | Runnable after? |
|---|---|---|---|
| 1 | **Data layer** | Supabase migration | ✅ written |
| 2 | **Shared libs** | config, supabase repo, profile | — |
| 3 | **Clients** | Claude + BetterContact | — |
| 4 | **Sources** | HN / RemoteOK / WWR / YC + scoring + dedupe | `pnpm outreach:source` lists leads |
| 5 | **Brains** | personalize + classify | — |
| 6 | **Sender** | draft / smtp / export | — |
| 7 | **Orchestrator** | source/enrich/draft/send/followup + pipeline | full `pnpm outreach:run` works in draft mode |
| 8 | **Dashboard + cron + docs** | admin UI, API, GitHub Actions, env, README | end-to-end with insights |

Each phase is independently testable; **Phase 7 is the MVP that actually gets clients**
(sources real leads, drafts personalized emails, you send them). Phase 8 adds the
control surface and automation.

> **Status: all 8 phases implemented & committed.** `next build` is green; sourcing,
> personalization, enrichment, Gmail send, and IMAP are all proven live. See
> `docs/outreach/SETUP.md` to run it. Remaining for you: apply the migration + set the
> free keys, then `pnpm outreach:run`.

---

## 10. Configuration (committed config file + secrets-only env)

Operational settings live in **`scripts/outreach/outreach.config.json`** (committed,
non-secret): sources, segments, keywords, min score, country exclude lists, experience
gate, enrichment providers, LLM providers, send mode (`draft`), daily caps, follow-up
cadence (`3,7,14`), timezone, from name/email, portfolio/booking URLs, social links.
Edit that file to retune the engine. Any value can still be overridden by an env var of
the same `OUTREACH_*` name — that's how CI injects `OUTREACH_DRY_RUN`.

**Secrets** stay in `.env.local` locally and in GitHub Actions secrets for the cron:

```bash
SUPABASE_URL=...                # shared with the blog system
SUPABASE_SERVICE_ROLE_KEY=...
GROQ_API_KEY=...                # free — drafting + reply classification
GEMINI_API_KEY=...              # free fallback (optional)
GMAIL_APP_PASSWORD=...          # compose/manual sending + local IMAP reply polling
RESEND_API_KEY=...              # daily digest from CI (Gmail SMTP is blocked on cloud IPs)
RESEND_FROM_EMAIL=...
# Optional paid (off by default): ANTHROPIC_API_KEY, PROSPEO/HUNTER/BETTERCONTACT keys
```

(Reuses existing `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` and admin auth.)

---

## 11. Security & isolation

- **Portfolio never sends mail** → its domain reputation can't be harmed.
- Outreach tables are **RLS-locked**, service-role only; admin routes are protected by
  the existing `getAdminSession()` + `rejectIfNotSameOrigin()` helpers.
- Worker runs on a **separate** GitHub Actions workflow with its own secrets — failures
  there don't touch the blog publisher or the site.
- `OUTREACH_DRY_RUN=1` is the default so nothing leaves your machine until you opt in.
- Unsubscribe handling + suppression list respected in `smtp` mode (compliance).

---

## 13. Honest reliability review, risks & compliance

This plan is concrete where we control the code, and **assumption-bearing at the external
edges**. No outreach system touching third-party APIs + email deliverability + scraping is
"100% reliable." Here is the candid assessment.

### Confidence by component

| Component | Confidence | Note |
|---|---|---|
| Data model + pipeline | 🟢 High | We own it; proven pattern |
| Dashboard + conversation view | 🟢 High | Standard CRUD/charts |
| **HN lead sourcing** | 🟢 **PROVEN (PoC, live)** | June-2026 thread: 303 postings → 299 ICP-matched leads; parser pulls company/role/remote/stack/email/geo correctly |
| **LLM personalization** | 🟢 **PROVEN (PoC, live, free)** | Unique per-lead email generated on **Groq free tier**, clean `{subject,body}` JSON, compliance footer attached |
| **Free email-from-post** | 🟢 **Measured: 29%** | Of relevant HN leads, 29% already include an email in-post — that fraction needs **no** BetterContact credit |
| RemoteOK / WWR / YC sources | 🟢 **PROVEN (PoC, live)** | RemoteOK 100 jobs, WWR 52 items, YC 5,955 cos — all fetched & parsed |
| Reddit / Wellfound / Indie Hackers | 🔴 **Tested = blocked** | 403 / Cloudflare / no-API from automated hosts → deferred or manual, not core |
| IMAP reply ingestion + bounce detect | 🟡 **Local-only** | Mechanism proven (raw TLS login, inbox read) — but Gmail blocks logins from cloud IPs, so it's **not in the CI cron**. Run `pnpm outreach:imap` locally, or paste replies into the dashboard |
| Experience gate + content rules | 🟢 **PROVEN (unit tests)** | 12/12 assertions pass (years parsing, resume/cover-letter/social detection) |
| Enrichment (in-post + free-finder) | 🟢 **PROVEN (PoC, live)** | 29% in-post measured; free-finder found published emails + MX for kanary/starbridge/goshop. No paid API, no ToS risk |
| Free finder hit-rate (overall) | 🟡 Medium | Strong for small startups (our ICP); weak for big firms that hide emails. Manual-csv lane covers the gap for top leads |
| ~~Prospeo/Hunter/Apollo free API~~ | ⛔ **Not available** | **Verified:** their free tiers have **no API** (paid only); multi-account = ban. Manual extension + CSV import only |
| Gmail send (mechanism) | 🟢 **PROVEN (PoC, live)** | `send.ts` authenticated via app password, Gmail accepted (`250 OK`). Deliverability *at volume* to strangers is the remaining variable (industry-wide, low free ceiling) |
| Legal compliance | 🟠 Addressable | Built in from day one (this section) |
| Lands clients | 🟡 Realistic | Numbers game; ~1–5% reply rates |

**PoC scripts:** `scripts/outreach/poc/` — `hn` ✅, `draft` ✅ (free Groq), `freefinder` ✅
(live), `send` ⏳ (your Gmail app password). `prospeo`/`hunter` exist but need a **paid** API
plan. See `scripts/outreach/poc/README.md`.

**Verified enrichment facts (June 2026):** Prospeo free = no API ([restriction policy](https://help.prospeo.io/en/article/why-is-my-account-restrictedsuspended-9s6ar/));
Hunter free = no API, 25 searches/mo ([free plan](https://help.hunter.io/en/articles/11060999-what-s-included-in-hunter-s-free-plan));
Apollo free = no API/enrichment ([API pricing](https://docs.apollo.io/docs/api-pricing));
multiple accounts prohibited → permanent suspension.

### Key risks & mitigations

1. **Deliverability vs. "max volume" tension.** Free `@gmail.com` cold-sending is spam-prone
   and risks account suspension above ~a few dozen/day. *Mitigation:* default to `draft`,
   keep `gmail` mode modest + highly personalized, and treat a ~$1–10/yr dedicated domain +
   warmup as the real path to scale. **Set expectations: free = low-volume/high-quality.**
2. **Source brittleness.** Unofficial APIs (YC index, HN free-text, RemoteOK Cloudflare) can
   change/block. *Mitigation:* each source is an isolated adapter that fails soft (a broken
   source logs and is skipped; others keep running). RemoteOK **attribution backlink** stored
   per lead to honor their terms.
3. **Email accuracy / bounces.** Even "verified" emails bounce; bounces hurt sender rep.
   *Mitigation:* prefer `verified` status, track bounces, auto-suppress, throttle on spikes.
4. **Geo inference is noisy.** Many leads lack a clear country. *Mitigation:* score is a
   weighting, not a gate; enrichment confirms country before any restricted-market decision.
5. **Prospect segment is colder.** Emailing non-hiring companies = lower reply rates + higher
   legal sensitivity. *Mitigation:* keep prospect volume small, lean on warm hiring-signal
   leads first, use prospect mainly for LinkedIn/manual.

### Compliance rules (enforced in code, not optional)

- **Every email** includes: clear sender identity, a **real postal address**, and a working
  **one-click opt-out**. (CAN-SPAM US; opt-out EU regimes.)
- **Opt-in-only countries are never cold-emailed:** Germany, Spain, Italy, Poland, Austria,
  Belgium → flagged `email_blocked`, routed to LinkedIn/manual. (German *Abmahnung* risk is
  real: fines from a single message.)
- **Cold-email-OK (opt-out) markets:** US, UK, Canada, Australia, UAE, Netherlands, Ireland,
  France, Sweden, + remote-worldwide companies.
- **Suppression list** honored before every send; one "unsubscribe"/"not interested" = never
  contacted again.
- B2B **corporate addresses only** (no obvious personal addresses) to stay within legitimate-
  interest grounds.

**Local "no website" lane (§4e) — channel-specific compliance posture.** Cold WhatsApp/phone
outreach to businesses found on a public map is **legally heavier** than the email lane and
**off the platform's preferred path** (WhatsApp's Business terms discourage unsolicited contact),
so this lane is deliberately constrained:
- **Manual-only, draft mode.** Nothing is ever auto-sent. Each message is reviewed and dispatched
  by a human from the dashboard, who is the per-lead decision-maker on whether contact is
  appropriate. There is no auto-send/auto-followup path for this segment (`send.ts` gates on the
  `channel` field; `followup.ts` skips `local_no_website`).
- **Opt-out honored structurally.** Every message carries a plain opt-out ("reply 'no' and I
  won't message again"). The dashboard's "they opted out — don't contact again" / "skip" action
  sets the lead `skipped`; because re-sourced OSM businesses dedupe on company+city against
  existing rows, a skipped/contacted business is **never re-surfaced** — dedupe is the phone
  suppression mechanism.
- **Accuracy hedge.** Because a missing OSM `website` tag ≠ no website, the pitch never asserts
  they lack a site — it hedges ("couldn't find a website for you"), and `enrich.ts` drops any
  business found to already have a live site.
- **Known gaps (accepted for a manual, free v1; revisit before any automation):** no dedicated
  phone-suppression table (skip+dedupe covers it), no data-retention TTL on stored phone numbers
  (applies engine-wide, not just here — see retention note below), and "sent" is recorded on
  click-to-compose, not on confirmed delivery (same convention as the email lane, with undo).
  **If this lane is ever made auto-send, all three must be hardened first.**

> **Data retention (engine-wide, GDPR Art. 5(1)(e)):** leads — including OSM business phone
> numbers — are currently retained without an automatic TTL. A monthly cleanup that deletes
> un-contacted, un-replied leads past a retention window (e.g. 12 months) is the recommended
> hardening; it is not yet implemented.

> Bottom line: the engine is **reliable as an engineering system** and **honest about its
> ceilings**. It will reliably *find, qualify, personalize, track, and help you send* — but
> volume is capped by deliverability physics and law, not by the code. Treat it as a
> quality-first client-acquisition machine, not a spam cannon.

---

## 12. Free high-value features — now folded into v1 ✅

All of these are **in scope for the build** (sections noted), because they add real
conversion lift at zero cost:

1. ✅ **Auto-ingest replies via Gmail IMAP** → §5 (`imap.ts`). Closes the loop hands-free + powers reply/bounce tracking.
2. ✅ **Follow-up sequences (3,7,14)** → §5 (`followup.ts`). Biggest free lever (~doubles replies).
3. ✅ **Cal.com booking link in every email** → §5a.
4. ✅ **More free sources** (Reddit r/forhire, Wellfound, Indie Hackers) → §4.
5. ✅ **Per-lead landing pages `/for/{company}`** → §6.8 (also = first-party click tracking).
6. ✅ **Send-time optimization** (prospect business hours) → §6.9.
7. ✅ **A/B subject testing** (reply-based, no pixels) → §5.
8. ✅ **LinkedIn lane** for `email_blocked`/`enrich_failed` leads → §6.10.
9. ✅ **Delivery / engagement / reply tracking** (who received / clicked / replied) → §6.7.
10. **Blog warm-up (free, optional):** reference a relevant post from your existing auto-blog for credibility.

### Patterns borrowed from Reply Intelligence (de-reply-classifier) — built ✅

11. ✅ **AI quality gauntlet** (`lib/qualify-ai.ts`): free Groq judgment pass before drafting —
    rejects staffing agencies, dev shops, non-profits, spam, enterprise-only roles. Rejections
    carry the reason (`ai_gauntlet[g1]:<reason>`). Fail-open on LLM errors. Toggle: `aiQualify`.
12. ✅ **Rejected-with-reason audit trail**: keyword-relevant leads that fail a gate (geo,
    score, experience, gauntlet) are inserted as `rejected`/`email_blocked`/`over_required_experience`
    with `status_reason` instead of being silently dropped. Dashboard: "rejected" filter;
    "all" hides audit rows. (Also fixed: blocked/over-exp leads were previously never inserted.)
13. ✅ **Prompt versioning**: `PROMPT_VERSION` (drafts → `ai_meta`), `CLASSIFY_PROMPT_VERSION`
    (replies → `classification_raw`), gauntlet version in the rejection reason — so reply
    rates can be compared across prompt iterations.
14. ✅ **Coverage without staleness** (`outreach_source_state` + `lib/state.ts`): HN processes
    its **entire** monthly thread every night (all posts ≤1 month old; new posts picked up
    same-night; dedupe makes re-scans free — no cursor needed). YC rotates a cursor through a
    **freshness-restricted pool only**: Active companies from the last 3 batch-years (~1.5k),
    properly year-sorted — deep rotation never reaches dead/acquired/decade-old companies.
    Fail-soft if the state table is missing; cursors persist only on non-dry runs.
    RemoteOK/WWR are fixed fresh feeds (no pagination exists).

### Later / needs spend
- OSM/Overpass local-business source + domain-only enrichment.
- Multi-inbox round-robin + automated warmup for higher volume (needs extra domains/inboxes).
- Paid enrichment APIs (Prospeo/Hunter/BetterContact) if you ever want higher hit-rates.
