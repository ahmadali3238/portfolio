# Outreach Engine — Setup & Daily Use

100% free. Secrets live in `.env.local` / GitHub secrets; all tunable settings live in
the committed config file **`scripts/outreach/outreach.config.json`**.

## Current state (June 2026)

Fully deployed and running:
- ✅ Supabase migration applied (`outreach_*` tables)
- ✅ GitHub Actions secrets set (`SUPABASE_*`, `GROQ_API_KEY`, `GEMINI_API_KEY`,
  `GMAIL_APP_PASSWORD`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`)
- ✅ Vercel env already present (dashboard + tracking routes work in prod)
- ✅ Nightly cron live: **1:30 AM PKT Mon–Fri** (`30 20 * * 0-4` UTC) → source → enrich →
  draft → send (draft mode) → followup → notify

## The daily loop (your part, ~10 min)

1. Morning: the **digest email** is in your inbox — drafts ready (follow-ups called out),
   stats, bounce health, and a **Review & send →** button.
2. It opens `/admin/outreach` (login returns you there). Use the **"to review"** filter —
   it lists every lead with a pending draft, including follow-ups on already-sent leads.
3. Per draft: **Open in Gmail** (desktop, normal compose popup) or **Open in mail app**
   (mobile, native compose) → review → hit Send. **Opening auto-marks it sent**; tap
   "undo" if you didn't actually send. Skip weak leads with **skip**.
4. When a prospect replies: paste the reply into the lead's thread → it's classified and
   a follow-up is drafted for you. (Optional: `pnpm outreach:imap` locally auto-ingests
   replies/bounces — Gmail blocks IMAP from CI, so this one is local-only.)

## Failure alerts (you never need to babysit)

- Any failed stage → the GitHub Actions run goes **red** (GitHub emails you) **and** the
  digest arrives with a **⚠️ failure banner** — even on days with 0 drafts.
- Silence = a healthy night with nothing new.
- Bounce-rate >10% shows a warning in the digest (and auto-pauses any automated sending).

## Configuration

Edit `scripts/outreach/outreach.config.json` (committed, non-secret) — sources, keywords,
country excludes, experience gate, send mode, caps, follow-up cadence (`3,7,14`), URLs.
Env vars of the same `OUTREACH_*` name override it (CI uses this for `OUTREACH_DRY_RUN`).

Secrets only in `.env.local`:

```bash
SUPABASE_URL=... / SUPABASE_SERVICE_ROLE_KEY=...   # shared with the blog
GROQ_API_KEY=...                                   # free — writes + classifies
GMAIL_APP_PASSWORD=...                             # sending + local IMAP
RESEND_API_KEY=... / RESEND_FROM_EMAIL=...         # digest from CI
```

## Manual commands

```bash
pnpm outreach:run        # full pipeline (what the cron runs)
pnpm outreach:source     # individual stages: source | enrich | draft | send | followup | notify
pnpm outreach:imap       # pull replies + bounces from Gmail (local only)
# safety: OUTREACH_DRY_RUN=1 pnpm outreach:run   → prints, writes nothing
```

## Scaling up later (when messaging is proven)

- Flip `sendMode` to `"gmail"` + `autoApprove: true` in the config for hands-free sending
  via Gmail SMTP — raises account risk from ~zero to low; ramp slowly (~10/day).
- Real scale = a ~$1–10/yr dedicated sending domain (`smtp` mode) with SPF/DKIM/DMARC +
  warmup. The portfolio domain is never in the sending path in any mode.

## Cost

₨0. Groq/Gemini free tiers write everything; enrichment is free (in-post + site scrape);
Supabase/GitHub Actions/Resend free tiers carry storage, cron, and the digest (~1–3% of
each quota at current volume).
