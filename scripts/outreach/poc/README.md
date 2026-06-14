# Outreach Engine — Proof of Concept

Tiny scripts that validate the riskiest assumptions **before** building the full pipeline.
The whole stack is **100% free** — no paid keys required. Each script runs independently.

| Script | Tests | Needs (all free) | Status |
|---|---|---|---|
| `pnpm outreach:poc:hn` | Free HN lead sourcing + parsing + scoring | nothing | ✅ **proven** (303 → 299 leads, 29% with free email) |
| `pnpm outreach:poc:sources` | RemoteOK / WWR / Reddit / YC / Wellfound / IH | nothing | ✅ **tested** (RemoteOK/WWR/YC pass; Reddit/Wellfound/IH blocked) |
| `pnpm outreach:poc:draft` | Personalized email (no template) | `GROQ_API_KEY` (free) | ✅ **proven** (free Groq) |
| `pnpm outreach:poc:freefinder` | Free email enrichment (site scrape + MX) | nothing | ✅ **proven** (kanary/starbridge/goshop) |
| `pnpm outreach:poc:qualify` | Experience gate + content-rule detection | nothing | ✅ **proven** (12/12 unit tests) |
| `pnpm outreach:poc:imap` | Gmail IMAP reply ingestion (built-in tls) | `GMAIL_APP_PASSWORD` (free) | ✅ **proven** (login + inbox read) |
| `pnpm outreach:poc:send` | Free Gmail send + inbox/spam check | `GMAIL_APP_PASSWORD` (free) | ✅ **proven** (Gmail 250 OK, inboxed) |

> **Verified (June 2026):** Prospeo / Hunter / Apollo **free tiers have NO API** (paid only),
> and multiple free accounts are banned. So the only free *automated* enrichment is **in-post
> emails + the free-finder**, plus an optional **manual** lane (their free browser extensions,
> by hand, CSV export). `prospeo.ts` / `hunter.ts` / `bettercontact.ts` remain in the repo but
> require a **paid** API plan and are off by default. Claude is likewise optional/off.

## Setup — all free keys

Add to `.env.local` (copy from `.env.example`):

```bash
GROQ_API_KEY=...                 # free — console.groq.com  (writing emails)
OUTREACH_FROM_EMAIL=ahmadalibusiness3238@gmail.com
GMAIL_APP_PASSWORD=...           # free — Google Account → App passwords (needs 2FA)
# (no email-finder key needed — enrichment is free via in-post + site scrape)
```

## What each proves

- **hn** — already run live. Real ICP-matched leads (remote, US/target geo, React/Next/AI),
  ~29% with an email already in-post.
- **draft** — already run live on **free Groq**. Unique, specific email per lead + clean
  `{subject, body}` JSON + compliance footer. Use `OUTREACH_LLM_PROVIDER=gemini` to try Gemini.
- **freefinder** — already run live. Scrapes a company's `/contact` `/team` `/about` pages for
  published emails + MX-checks the domain. Proven on real HN leads (kanary/starbridge/goshop).
  Usage: `tsx scripts/outreach/poc/freefinder.ts <domain> [First] [Last]`.
- **send** — emails *you* via Gmail SMTP. Check inbox vs spam — the honest deliverability test.
- **prospeo / hunter** (optional, **paid API only**) — kept for reference; their free tiers
  have no API, so these need a paid plan. Not part of the free path.

## After the PoC

Once these pass on your machine, every 🟠/🟡 rating in
`docs/outreach/IMPLEMENTATION-PLAN.md` §13 flips to 🟢 and we build the full free pipeline.
