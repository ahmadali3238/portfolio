# Free Client-Acquisition Research & Implementation Plan

> **Status:** Research complete (2026-06-14). Implementation deferred — this doc is the saved
> record + the build plan we execute later.
> **Method:** Multi-agent research workflow — 8 blind finders swept distinct channel categories
> with live web search → 90 channels adversarially verified against 2026 reality (free API? ToS?
> Pakistan-eligible? ban risk?) → synthesized against the existing outreach engine.
> **Totals:** 107 channels discovered → 90 verified → **3 `implement_now`, 33 `manual_recommend`,
> 42 `deprioritize`, 12 `reject`**.
> **Profile assumed:** Muhammad Abdullah — Full-Stack + AI/Agentic engineer, Lahore PK, ~2 yrs,
> React/Next/Node/FastAPI + Claude/MCP/LangGraph/RAG, Anthropic-certified, C1 English, on
> Upwork/Fiverr, **zero budget (no paid APIs/tools/ads), ban-averse, offshore solo dev.**

---

## TL;DR — the honest bottom line

The research **disproves the premise that there's a pile of untapped free channels.** After
verification, only **3 channels are genuinely automatable** into the existing pipeline at zero
budget without ToS/ban risk, and most "channels" are thin top-of-funnel feeders, not real client
taps. The wins are **not new marketplaces** — they are:

1. **Reposition, don't re-platform.** The single highest-leverage move is **rewriting the Upwork
   profile around AI-agent / Claude / MCP positioning.** AI is the *one Upwork segment growing in
   2026* (AI-integration demand +178% YoY, AI freelancers +40% rates) while generic full-stack
   shrinks. He already has the account, geo-eligibility, and a warm-client base → immediate, zero-cost yield.
2. **Deepen the engine you already built** rather than chase brittle new sources — tighten the
   AI-niche scorer, add the HN *"Freelancer? Seeking freelancer?"* thread, prefer contract/worldwide leads.
3. **Add exactly one clean new feed:** **web3.career's official free JSON API** — the only
   newly-discovered, ToS-permitted feed with a clean `RawLead` mapping.
4. **Build compounding credibility on the real differentiator:** one polished **open-source
   MCP/Claude artifact** + a portfolio repositioned as a *closing asset*, with manual cross-posting.

**The trust gap is the real enemy** (offshore solo + ~2 yrs experience). His **Anthropic certs +
agentic/MCP work are rare** and must be the spearpoint of *every* profile, proposal, post, and cold
email — that's the one thing that consistently offsets it.

**Hard truths the verification surfaced:**
- Every elite marketplace (Toptal, Arc, Andela, Gun.io, Braintrust) is gated by a de-facto **5+-year
  experience bar** he doesn't meet → slow manual lottery tickets, revisit in 2–3 yrs.
- Every community (Discord/Slack/LangChain/MCP/Anthropic) is a **credibility play with
  anti-solicitation rules and zero automation surface.**
- Every AI-tool directory lists **products, not buyers** — wrong channel shape; several now paid-only.
- **No ToS-safe adapter exists for Reddit, LinkedIn, X, Wellfound, or Mastodon** — manual use only.

---

## The shortlist we build later (`implement_now` + cheapest high-leverage)

| # | Move | Type | Effort | Where |
|---|------|------|--------|-------|
| 1 | **Rewrite Upwork profile** → "AI Agent & Claude/MCP Engineer (Anthropic-certified)" + 2–3 AI case studies | Manual (copy) | Low | Upwork |
| 2 | **web3.career source adapter** (official free JSON API) | Code | Low (~30 min) | `scripts/outreach/lib/sources/web3career.ts` |
| 3 | **HN "Freelancer? Seeking freelancer?" thread** variant + sort-first flag | Code | Low | `scripts/outreach/lib/sources/hn.ts` |
| 4 | **Tighten AI-niche scorer/keyword gate** — uprank agentic/MCP/RAG, drop US-only/onsite/W2 | Code | Low | `scripts/outreach/lib/scoring.ts` + `http.ts` |
| 5 | **Contact-form → Supabase `leads` capture** route + keepalive cron | Code | Med | new API route + GH Action |
| 6 | **GitHub profile README** leading with certs + pinned flagship repos | Manual | Low | `Abdullahfalak007/Abdullahfalak007` repo |

---

## Ranked roadmap (all 12, full detail)

### Rank 1 — Upwork profile optimization + AI/agentic repositioning + warm re-engagement  ·  *manual, high value*
- **Why for him:** Already account/geo/payment-eligible (Payoneer); the new-signup PK ID scrutiny does
  *not* apply to existing accounts. AI is the only growing Upwork segment in 2026 (AI-integration
  +178% YoY, AI-chatbot +71%, AI freelancers +40% rates). His Anthropic certs + agentic/MCP/Claude
  work beat the offshore price war — he competes on **specialization, not price.**
- **Yield:** HIGH, near-term. Warm re-engagement converts far above cold; an AI-led profile surfaces
  first for "LangChain expert" / "AI agent developer" searches.
- **Effort:** Low — an evening: rewrite headline + About, 2–3 outcome-framed AI case studies, pin testimonials.
- **Automation:** Mostly manual — **no ToS-safe Upwork adapter exists** (official GraphQL is read-only,
  24h cache cap forbids persisting leads, scraping = permanent ban). One overlap: reuse `detectStack()`
  + qualified-lead descriptions in `/admin/outreach` to surface trending Upwork keywords, then hand-write the profile. **Do NOT register an Upwork adapter.**
- **First step:** Rewrite headline + About to lead with "AI Agent & Claude/MCP Engineer
  (Anthropic-certified)"; add case studies. Re-engage past clients via Upwork rehire; email
  off-platform **only** clients whose first contract is 24+ months old.

### Rank 2 — Deepen the existing pipeline (HN / RemoteOK / WWR / Himalayas / YC / OSM)  ·  *automate*
- **Why:** The already-built, ToS-clean, zero-budget engine that **nothing in the 90-channel set beats.**
  Verification confirmed these are the only feeds that answer `fetch` cleanly. Best ROI is squeezing
  more qualified AI-niche contract/remote-worldwide leads out of them.
- **Yield:** MODERATE & compounding — ~10–15 warm, well-fit manual sends/day. Quality lane (HN founders
  value Anthropic certs) outperforms volume.
- **Effort:** Low — tuning filters/qualification, not new infra.
- **Automation plan:** (1) Tighten AI-niche scorer/keyword gate (`http.ts STACK_KEYWORDS` already has
  claude/anthropic/mcp/agentic) to uprank agents/RAG/MCP and **drop US-only/onsite/W2/no-contractor**
  posts; (2) add a contract/remote-worldwide preference flag so HN's ~12% contract + ~8% worldwide
  subset floats to the top of the review desk; (3) parse the monthly *"Ask HN: Freelancer? Seeking
  freelancer?"* thread as a higher-priority variant in `hn.ts`.
- **First step:** In `hn.ts`, add a second Algolia query for the freelancer thread; tag those leads
  `segment='hiring_signal'` with a `freelance_thread` flag in `signalRaw` so the dashboard sorts them first.

### Rank 3 — web3.career official free JSON API (new source adapter)  ·  *automate*
- **Why:** The single best NEW automatable feed found — **official, free, token-based JSON API (not
  scraping)** with a clean `RawLead` mapping. Crypto companies with budget actively hiring
  AI/agent/LLM engineers, remote-global, offshore-friendly. Maps directly to "company hiring AI talent → cold-pitch contract help."
- **Yield:** LOW–MODERATE. It's a job board, so realistic value is lead-*detection* (buying signal to
  cold-pitch), not direct gigs. Above-average signal quality, modest volume.
- **Effort:** Low — request free token (email + portfolio domain), ~30 min adapter; reuses `getJson()` + `detectStack()`.
- **Automation plan:** `scripts/outreach/lib/sources/web3career.ts`: poll
  `GET https://web3.career/api/v1?token=...&tag=ai` (+ `chatbot`, `machine-learning`, `llm`); map each
  job → `RawLead { company, segment:'hiring_signal', source:'web3.career', sourceUrl: apply_url,
  signal: title, description, stack: detectStack(title+desc), country, postedAt: date_epoch }`; **omit
  email to force enrichment.** Dedupe on job id. Register in `REGISTRY` (`sources/index.ts`), add
  `'web3.career'` to `outreach.config.json` sources. **Official API only — never HTML-scrape the
  Cloudflare-protected pages.** Token in `.env` as `WEB3_CAREER_TOKEN`.
- **First step:** Request the free token at `https://web3.career/web3-jobs-api`, then scaffold by
  copying `remoteok.ts` and swapping endpoint + field mapping.

### Rank 4 — Open-source MCP/Claude artifacts (GitHub) as proof-of-work, syndicated  ·  *inbound, compounding*
- **Why:** His Anthropic + MCP certs are a rare credential; **one polished open-source MCP server or
  Claude tooling library is the highest-leverage credibility asset he can build** — it feeds every
  other channel (Upwork proposals, cold emails, profiles). GitHub is free, geo-clean, zero ban risk.
- **Yield:** MODERATE over 3–6 months, **indirect.** Near-zero direct clients from listings; high
  leverage as the proof-link that lifts outbound conversion and closes skeptics.
- **Effort:** Medium — build/document one useful MCP server (days), ~1–2 hrs to list across free registries.
- **Automation plan:** *Not* a source adapter (registries yield repos, not leads). One-directional
  pipeline touch: link the repo from `src/constants/data.ts` and from the cold-email/proposal templates
  the drafter generates, so every outbound message carries the proof-link. List the repo (manually,
  once) on `punkpeye/awesome-mcp-servers`, Smithery, mcp.so, skills.sh, SkillsMP, npm. Add a GitHub
  Action watching star velocity → `src/lib/notifications/dispatcher.ts`.
- **First step:** Pick ONE high-value MCP server idea (wrap a popular SaaS API or niche dev workflow),
  build + document (strong README + demo GIF), push public, link from portfolio + outreach drafts.

### Rank 5 — Portfolio as a closing/conversion asset + contact-form lead capture  ·  *inbound, compounding*
- **Why:** The site is already built (Next.js + AI blog + AI chat + certs) and makes a solo dev look
  established, lifting reply→contract conversion when prospects visit after Upwork/LinkedIn/cold-email/GitHub.
  Org-SEO discovery is dead on a `vercel.app` subdomain, but as a *closing surface* ROI is high & immediate.
- **Yield:** HIGH for conversion *quality* (not lead volume). Organic discovery ≈0; referral/closing value is real.
- **Effort:** Medium — move off vercel.app to a free dev subdomain, wire a contact form, link everywhere.
- **Automation plan:** Inbound code path, **not** a `(cursor)=>{leads}` adapter — keep it OUT of
  `sources/index.ts`. Add a Next.js API route inserting form submissions into a Supabase `leads` table
  reusing the `fetch` + service-role pattern in `src/lib/blog/repository.ts`, then send an ack email via
  `src/lib/notifications/email.ts` (Resend free, 100/day). Add a keepalive cron ping (existing GH
  Actions) to dodge Supabase's 7-day inactivity pause. Captured emails surface in `/admin` as warm inbound.
- **First step:** Move the site from `*.vercel.app` to a free `is-a.dev` / `js.org` subdomain (the only
  zero-cost path to indexing), then add the contact-form → Supabase route and link from every profile.

### Rank 6 — dev.to + Hashnode manual cross-posting of AI/agentic content  ·  *inbound, compounding*
- **Why:** He already auto-generates blog content; repurposing a hand-edited subset to a dev audience on
  his real differentiator (Claude/MCP/agentic) is near-zero marginal effort + a free backlink. Both free, geo-clean.
- **Yield:** LOW & slow (months), indirect. Audience skews learners/peers → weak direct conversion;
  value is credibility feeding Upwork/outbound.
- **Effort:** Low–medium per post; the marginal cost is human editing + AI disclosure.
- **Automation plan:** **Do NOT auto-firehose the blog generator** (dev.to ToS §11 bans
  promotion/backlink-primary content; undisclosed AI posts get shadow-removed; **Hashnode's free GraphQL
  write API was paywalled June 2026**). Manual only: publish to the portfolio first, then 5–7 days later
  hand-post to dev.to (free api-key, `canonical_url` → portfolio, AI disclosed) + Hashnode web editor.
  Free *read* APIs are content-intelligence at best, not a lead source.
- **First step:** Write ONE deep post on his strongest niche (e.g. "Building a production MCP server with
  Claude"), publish on the portfolio, cross-post to dev.to with canonical + disclosure.

### Rank 7 — Pakistan AI-startup news RSS (TechJuice / ProPakistani / Google News) feeder  ·  *automate (low priority)*
- **Why:** Free, live, ToS-permitted RSS that's trivial to wire — but honestly the **wrong currency
  pool** (PK startups pay PKR, 2–4× below USD target). Worth it only as cheap padding + a signal that a
  *foreign-funded startup with a PK office* (USD-paying) is hiring.
- **Yield:** LOW for the strong-currency goal — ~1 relevant funding event every 2–3 weeks. **Build last.**
- **Effort:** Low — RSS parse, reuses `getText()`.
- **Automation plan:** Optional `scripts/outreach/lib/sources/pkstartups.ts`: poll
  `techjuice.pk/feed/`, `propakistani.pk/feed/`, `news.google.com/rss/search?q=Pakistan+startup+funding`;
  gate hard on funding/hiring keywords (raised, seed, Series, hiring, CTO); map → `RawLead { segment:'prospect', source:'pk_startups', ... }`; omit email to force enrichment. Register only if breadth is wanted; deprioritize behind USD feeds.
- **First step:** When bandwidth allows, copy `wwr.ts` (RSS pattern), point at the three feeds, gate hard on keywords.

### Rank 8 — Past Upwork/Fiverr client reactivation (warm sequence, ToS-gated)  ·  *manual, high value*
- **Why:** **Highest yield-per-contact of any channel** — proven payers, Western currency, already sold
  on his quality; "I've leveled up to AI agents/Claude since we worked together" is a perfect re-open.
  But tiny N (~2 yrs history) and ToS lands it firmly in manual.
- **Yield:** HIGH per contact, tiny volume — maybe 1–3 conversions over a few months. A one-evening task, not an engine.
- **Effort:** Low — hand-compile a small warm list, 2–3 touch personalized sequence.
- **Automation plan:** No adapter. At most, a lightweight "warm list" CSV the draft/send stage in
  `/admin/outreach` templates against — **gated so off-platform email is reserved for the 24+-month
  cohort** (sub-24-month off-platform contact = permanent-ban circumvention). Re-engage newer clients *inside* Upwork/Fiverr messaging.
- **First step:** List every past client + first-contract date; message <24-mo clients via Upwork rehire, email only the 24+-mo cohort.

### Rank 9 — Reddit r/forhire + r/SideProject + AI subs (manual, ToS-compliant)  ·  *manual*
- **Why:** Geo-neutral, free; his AI-agent/Anthropic differentiator stands out in [Hiring] threads.
  r/SideProject welcomes self-promo; r/forhire + r/freelance_forhire are the real job venues.
- **Yield:** LOW–MODERATE, inconsistent. Western clients a minority, many "US/EU only." Opportunistic funnel.
- **Effort:** Low–medium — manual browsing + tailored replies; ~1 week account warm-up for karma/AutoMod gates.
- **Automation plan:** **ZERO automation — do NOT build a Reddit adapter.** Unauthenticated `.json` =
  403 since May 2026, free OAuth keys stopped Dec 2025, free tier is non-commercial, scripted access
  risks permanent bans (sharper given Reddit's litigation against Anthropic). Manual browser only.
- **First step:** Warm an account ~1 week with genuine comments in r/LocalLLaMA / r/AI_Agents, then post a clean [FOR HIRE] in r/forhire + "I built X" demos in r/SideProject.

### Rank 10 — Contra: free 0%-commission profile + invoicing rail  ·  *manual/inbound*
- **Why:** Genuinely free, **0% freelancer commission permanently**, Pakistan-eligible via Payoneer,
  ban-safe; dev/AI is a strong native niche. Best use: a polished passive inbound profile **AND a
  0%-commission billing rail** to migrate clients won elsewhere (clients don't need a Contra account to pay invoices).
- **Yield:** LOW–MODERATE, slow-burn inbound. Thin native job volume. Real value as a free invoicing surface.
- **Effort:** Low — ~1–2 hrs profile setup once.
- **Automation plan:** No adapter (no public opportunities API; ToS bans crawlers). Manual: profile
  keyword-loaded with Claude/Anthropic/MCP/LangGraph/agentic/RAG/FastAPI/Next.js, connect Payoneer
  (Stripe unavailable in PK), short portfolio video. Use to bill clients won via warm list / Reddit / cold-email at 0%.
- **First step:** Create the free Contra profile leaning on the AI differentiator + certs, set Payoneer payout, leave as passive asset.

### Rank 11 — GitHub profile README + developer-portfolios list (credibility, one-time)  ·  *manual*
- **Why:** Free, zero ban-risk, geo-clean. Converts skeptics already evaluating him (traffic driven by
  *his* links, not GitHub discovery). README leading with Anthropic certs + MCP/Claude work is trust-confirmation for every outbound touch.
- **Yield:** LOW direct, but a cheap multiplier on every other channel's conversion. Set-and-forget.
- **Effort:** Low — ~1–2 hrs total.
- **Automation plan:** No adapter (a publishing surface). One-time: `username/username` repo with README
  leading on the AI-agents/Anthropic-certs differentiator + CTAs to portfolio/AI-chat/LinkedIn + 2–3
  pinned flagship repos. Submit ONE PR to `emmabostian/developer-portfolios` for a free backlink. Drive traffic from proposals/LinkedIn/cold-email.
- **First step:** Create the profile README repo; link it from the portfolio and every external profile.

### Rank 12 — Show HN + AI-community presence (LangChain/MCP/Anthropic/CrewAI Discords)  ·  *credibility lane*
- **Why:** His **home communities** — Anthropic certs + agentic/MCP work are exactly on-topic; HN
  founders value that profile. A Show HN of an open-source AI/MCP tool is a strong one-shot credibility artifact.
- **Yield:** LOW & indirect. Audience = builders/peers, not buyers; strict anti-solicitation rules
  (LangChain Slack permabans lead-gen DMs). Slow reputation play, occasional organic inbound.
- **Effort:** Low per touch; reputation takes weeks–months.
- **Automation plan:** **ZERO automation** (Discord self-bots/scraping = ban; HN API read-only; CoCs ban
  lead-gen DMs). Manual: build karma by genuinely helping; post the rank-4 OSS tool to Show HN (Tue–Thu
  AM Pacific) + community showcase channels. **Never** cold-DM or post "available for hire." Only use `discord.gg/anthropic` (impersonators exist).
- **First step:** Once the rank-4 OSS tool exists, do one Show HN with demo + portfolio link; share non-promotionally in Anthropic/MCP Discord showcase channels.

---

## Quick wins (manual — start now, no code)

1. **Re-engage past clients NOW** — Upwork rehire for <24-mo clients; off-platform email **only** for 24+-mo clients with a personalized "I now build AI agents / Claude tooling" re-open. *(rank 8)*
2. **Free Contra profile** keyword-loaded with Claude/MCP/agentic/RAG + Payoneer, as a 0%-commission invoicing rail for clients won elsewhere. *(rank 10)*
3. **Move the portfolio off `*.vercel.app`** to a free `is-a.dev`/`js.org` subdomain so it can index; link from every external profile. *(rank 5)*
4. **Warm a Reddit account ~1 week**, then [FOR HIRE] in r/forhire + "I built X" demos in r/SideProject; answer in r/LocalLLaMA / r/AI_Agents. *(rank 9)*
5. **One deep hand-edited post** on his strongest niche (production MCP server with Claude) → portfolio → cross-post to dev.to (canonical + AI disclosure) + Hashnode web editor. *(rank 6)*
6. **Google Alerts RSS** for "Pakistan startup funding"; skim TechJuice/ProPakistani manually until/unless the rank-7 adapter exists. *(rank 7)*

---

## Avoid (verified dead-ends — don't spend time here)

| Channel(s) | Why it fails this profile |
|---|---|
| **Toptal / Arc.dev / Andela / Gun.io** | De-facto **5+-yr experience bar** he doesn't meet (~2 yrs). High-effort, long-funnel lottery tickets with rejection lockouts (Toptal 18 mo, Arc multi-year). Zero automation fit. *Revisit in 2–3 yrs.* |
| **Wellfound (AngelList)** | Triple mismatch: full-time employment board (not freelance), no free ToS-permitted feed (Cloudflare 403), and **VPN usage triggers account locks** — an asymmetric ban vector for a PK user. |
| **Reddit / LinkedIn / X source adapters** | All kill the automation premise: Reddit `.json` = 403 + non-commercial + active anti-Anthropic litigation; LinkedIn Sales Nav is paid + scraping-banned; X free API is read-useless + DMs need mutual-follow. **Manual use is fine; never build adapters.** |
| **AI-tool directories** (TAAFT, Futurepedia, futuretools, theresanaiforthat) | Wrong channel *shape* — they list AI **products for end-users**, not buyers of dev services. Several now paid-only (Futurepedia min $497). India-skewed. Near-zero freelance yield. |
| **Mastodon #hiring/#freelance/#remote RSS adapters** | mastodon.social ToS (eff. Jul 2025) **prohibits automated/data-mining access** — exactly the adapter use. Feeds capped at 20 items, **zero contact data** (bot reposts). Hit the underlying boards directly. |
| **MCP/Skills registries as LEAD sources** (smithery.ai, skills.sh, awesome-mcp) | Category error: APIs return **skills/servers, not buyers/jobs/contacts** — can never produce `RawLead`s. Worth a one-time manual *listing* for a credibility backlink (rank 4), but not a channel. |
| **Product Hunt as a lead channel** | Audience = makers/founders who build competing tools, not businesses hiring offshore devs. Anti-spam algorithm shadow-bans same-region (PK) upvote clusters. Only marginal as a one-time PR artifact. |
| **Lower-tier marketplaces** (Workana, PeoplePerHour, Guru, Twine, Codeable, Remotive-as-source) | Each fails: Workana = LATAM/PPP rates; PeoplePerHour = UK/EU bias + 3-mo lockout; Guru = 10 bids/mo cap; Twine = creative-skewed; Codeable = WordPress-only (his differentiator irrelevant); Remotive free API = ~29 contactless jobs + ToS-banned for outreach. |

---

## Implementation plan (codebase-mapped, for later)

> Source-adapter contract: an async `(cursor) => Promise<{ leads: RawLead[], nextCursor? }>` added under
> `scripts/outreach/lib/sources/<name>.ts`, registered in the `REGISTRY` of
> `scripts/outreach/lib/sources/index.ts`, with its name added to `outreach.config.json` → `sources`.
> Each `RawLead` = `{ company, segment, source, sourceUrl, signal, description, email?, phone?, domain?,
> stack?, country?, postedAt? }`. The pipeline then auto-enriches → AI-qualifies → drafts → surfaces in
> `/admin/outreach`. Keep zero-paid-API, ban-safe, draft-mode invariants intact.

### Phase 0 — Zero-code, immediate yield (we draft the copy together)
- [ ] **Upwork profile rewrite** — headline + About around "AI Agent & Claude/MCP Engineer
      (Anthropic-certified)"; 2–3 outcome-framed AI case studies; pin testimonials. *(rank 1)*
- [ ] **Warm-client reactivation list** — every past client + first-contract date; Upwork rehire for
      <24-mo, off-platform email only for 24+-mo cohort. *(rank 8)*
- [ ] **GitHub profile README repo** (`Abdullahfalak007/Abdullahfalak007`) — certs-first, CTAs, pinned
      flagship repos; PR to `emmabostian/developer-portfolios`. *(rank 11)*
- [ ] **Domain move** — portfolio off `*.vercel.app` → free `is-a.dev`/`js.org` subdomain; relink everywhere. *(rank 5)*
- [ ] **Free Contra profile** + Payoneer as a 0%-commission invoicing rail. *(rank 10)*

### Phase 1 — Cheap pipeline automation (the engineering core)
- [ ] **web3.career adapter** — request token (`WEB3_CAREER_TOKEN` in `.env.local` + GH secret); create
      `scripts/outreach/lib/sources/web3career.ts` (copy `remoteok.ts`); poll
      `api/v1?token=...&tag=ai|chatbot|machine-learning|llm`; map → `RawLead` (omit email → force
      enrichment); dedupe on id; register in `sources/index.ts`; add `"web3.career"` to config `sources`.
      *Official API only — never scrape.* *(rank 3)*
- [ ] **HN freelancer-thread variant** — in `hn.ts`, add a second Algolia query for *"Ask HN: Freelancer?
      Seeking freelancer?"*; tag leads with `signalRaw.freelance_thread = true` so the dashboard sorts them first. *(rank 2)*
- [ ] **AI-niche scorer tightening** — in `scoring.ts` (+ `http.ts STACK_KEYWORDS`), uprank
      agentic/MCP/RAG/Claude mentions; **drop/penalize US-only/onsite/W2/no-contractor** posts; add a
      contract/remote-worldwide preference flag floating HN's contract+worldwide subset to the top. *(rank 2)*

### Phase 2 — Inbound capture (NOT a source adapter)
- [ ] **Contact-form → Supabase `leads`** — new Next.js API route reusing the `fetch` + service-role
      pattern in `src/lib/blog/repository.ts`; ack email via `src/lib/notifications/email.ts` (Resend free,
      100/day). Add migration for a `leads` table. Captured emails surface in `/admin` as warm inbound.
      **Keep OUT of `sources/index.ts`.** *(rank 5)*
- [ ] **Keepalive cron** — existing GH Actions ping to dodge Supabase's 7-day inactivity pause.

### Phase 3 — Compounding credibility (build over weeks)
- [ ] **One open-source MCP/Claude server** — strong README + demo GIF; push public; link from
      `src/constants/data.ts` + the drafter's proposal/cold-email templates so every outbound carries the
      proof-link; list manually on awesome-mcp-servers / Smithery / mcp.so / skills.sh / npm; GitHub
      Action on star-velocity → `src/lib/notifications/dispatcher.ts`. *(rank 4)*
- [ ] **Manual content cross-post** — one deep hand-edited niche post → portfolio → dev.to (canonical +
      AI disclosure) + Hashnode web editor. *No auto-firehose.* *(rank 6)*
- [ ] **(Optional, last) PK-startup RSS feeder** — `pkstartups.ts` (copy `wwr.ts`), gated hard on
      funding/hiring keywords, `segment='prospect'`, deprioritized behind USD feeds. *(rank 7)*

### Phase 4 — Measure & double down (days 76–90)
- [ ] Review which lane produced real conversations (expect Upwork + warm reactivation + deepened
      pipeline to dominate near-term). Reallocate to channels with actual replies; keep the review desk at
      ~10–15 personalized manual sends/day; **do not spread into the avoid-list.**

**Invariant for every phase:** every profile, proposal, post, and cold email leads with the
**Anthropic-certs + agentic/MCP differentiator** — the one thing that offsets the offshore-solo + 2-year-experience trust gap.

---

## Appendix — all 90 verified channels

Verdicts: `implement_now` > `manual_recommend` > `deprioritize` > `reject`. "Free API" = whether a
free, ToS-permitted programmatic feed exists. "Geo" = Pakistan eligibility.

| Channel | Category | Verdict | Free API | Geo (PK) | Verifier note |
|---|---|---|---|---|---|
| Web3.career Web3/Crypto Jobs Board | niche_feeds | **implement_now** | yes | yes | Implement as a source adapter, NOT a scraper. Request the free API token (email + your portfolio domain), then poll GET https://web3.career/api/v1?token=...&tag=ai (and tags chatbot, machine… |
| RemoteOK JSON API | reddit_forums | **implement_now** | yes | restricted | Already in the pipeline. Daily-poll adapter: fetch endpoint, skip element[0], map job → RawLead { company, source:'remoteok', sourceUrl, signal: position, … }. (Confirms the existing adapter.) |
| Upwork Profile Optimization + Repeat Client Strategy | regional_warm | **implement_now** | yes | yes | implement_now with one correction: it's his existing platform, already account/geo-eligible (tightened PK ID/approval scrutiny hits NEW signups, not him). Reposition around AI/agentic. |
| Upwork Agency Accounts (Inbound Discovery) | agency_subcontract | **manual_recommend** | partial | yes | Manual inbound channel, never an automated adapter. PK eligible; the differentiated AI niche wins work. |
| Arc.dev (Vetted Freelance + Agency-Friendly) | agency_subcontract | **manual_recommend** | no | yes | Low-effort free "set-and-forget" inbound profile — not a pipeline channel. Create, submit for vetting, leave. |
| Contra (Creator + Small Agency Marketplace) | agency_subcontract | **manual_recommend** | no | yes | One-time manual setup, not automation. 0% commission, PK-eligible via Payoneer. |
| Reactiflux | communities | **manual_recommend** | no | yes | Join free; build reputation answering React/Next/agentic-AI questions where his MCP/agent niche differentiates. |
| Build In Public / #buildinpublic (X + Discord) | communities | **manual_recommend** | no | restricted | Manual personal-brand play, long horizon. Not pipeline. |
| DEV Community (dev.to) | communities | **manual_recommend** | yes | yes | Low-priority manual thought-leadership; no jobs/contacts → not an adapter. |
| Hashnode Community | communities | **manual_recommend** | yes | yes | Passes every hard constraint; manual credibility channel. (Write API paywalled June 2026.) |
| Reddit Tech Communities (r/reactjs, r/typescript, r/startups…) | communities | **manual_recommend** | no | restricted | Not an automation channel — do NOT register a Reddit adapter (ToS/IP-ban risk). Manual only. |
| dev.to (Forem) | inbound_content | **manual_recommend** | yes | yes | Credibility/SEO syndication, not a client-acquisition channel. |
| GitHub Profile README | inbound_content | **manual_recommend** | no | yes | Low-effort, zero-cost credibility asset; do once, manually. Not lead-gen. |
| Building in Public (X/LinkedIn) | inbound_content | **manual_recommend** | partial | yes | 6–12 month brand/credibility asset, not a client tap. Free, geo-OK. |
| Lead Magnets & Interactive Tools (Portfolio) | inbound_content | **manual_recommend** | yes | yes | Legit zero-cost asset; sequence AFTER traffic exists — conversion multiplier, not a lead source. |
| Contra | marketplaces | **manual_recommend** | no | yes | LOW–MODERATE slow-burn inbound; stand up a polished free profile. |
| Braintrust | marketplaces | **manual_recommend** | no | yes | MODERATE worth-it manual channel; easy approval (one 10-min video, no Toptal-style gauntlet). Don't overinvest. |
| PeoplePerHour | marketplaces | **manual_recommend** | no | restricted | One careful manual application; UK/EU proximity bias + rejection lockout risk. |
| Turing.com | marketplaces | **manual_recommend** | no | yes | Manual set-and-forget inbound; lean into AI/LLM angle. |
| Contra Freelance/Contract Marketplace | niche_feeds | **manual_recommend** | no | yes | Passive profile + selective manual applies; free plan fully usable. Not an adapter. |
| GitHub Trending / Releases (Organic Discovery) | oss_tools | **manual_recommend** | partial | yes | Worth doing manually; MCP/LangGraph/Claude-SDK niche genuinely discoverable. Not pipeline-automatable. |
| npm Registry (Packages & Discoverability) | oss_tools | **manual_recommend** | yes | yes | Credibility/SEO asset, not lead-gen, not an adapter. |
| Indie Hackers (Launch Community) | oss_tools | **manual_recommend** | no | yes | Publish one genuinely useful free/OSS AI tool + candid build post; AI-builder audience fits. |
| Reddit (r/SideProject, r/OpenSourceAI, r/LocalLLaMA) | oss_tools | **manual_recommend** | no | restricted | Manual, narrow, credibility/inbound. No automated reading/posting (now ToS-prohibited). |
| dev.to & Hashnode (Technical Content Platforms) | oss_tools | **manual_recommend** | yes | yes | Manual slow-burn credibility/personal brand, not automatable lead source. |
| Personal Portfolio Site + Blog (SEO + Funnel) | oss_tools | **manual_recommend** | partial | yes | Keep the site, drop the SEO-traffic fantasy on vercel.app (~0 qualified organic). Closing asset. |
| HackerNews "Who is Hiring" Thread + Official API | reddit_forums | **manual_recommend** | yes | restricted | Low-volume ban-safe adapter via free Algolia API; prioritize the "Freelancer? Seeking freelancer?" thread. |
| Reddit r/forhire + r/remotejs + r/hireaprogrammer | reddit_forums | **manual_recommend** | no | yes | Manual browse for [Hiring]+tech/AI flair a few times/week. No adapter. |
| Fiverr (Already Using) | reddit_forums | **manual_recommend** | no | yes | Keep as manual inbound; saturated + shrinking. No adapter. |
| Toptal (Selective/Gated Platform) | reddit_forums | **manual_recommend** | no | yes | Real/free/PK-eligible but poor fit for the objective (experience bar). |
| PakLaunch Community + Facebook Job Board | regional_warm | **manual_recommend** | no | restricted | Join free FB group + Beginner tier; once-weekly skim. PK-currency-skewed. |
| Past Upwork/Fiverr Client Reactivation | regional_warm | **manual_recommend** | no | yes | Only OLDEST clients (>24 mo) reactivate off-platform cleanly; rest via Upwork Connects/messaging. |
| Contra (Commission-Free, Inbound) | regional_warm | **manual_recommend** | no | yes | One-time manual setup; free plan, 0% commission. |
| Wellfound (Free, Startup-Focused) | regional_warm | **manual_recommend** | no | restricted | One-time low-effort manual profile (AI/agentic keywords) as passive inbound; VPN = lock risk. |
| Arc.dev (Pakistan Freelancers) | regional_warm | **manual_recommend** | no | restricted | Single manual application attempt (free); AI differentiators help. Not automation. |
| Upwork Profile Optimization + Repeat Client Strategy | regional_warm | **manual_recommend** | yes | yes | (See rank 1.) Reposition + warm re-engage. |
| Toptal (3% Acceptance) | regional_warm | **manual_recommend** | no | yes | Strongest 2026 demand matches his AI niche, but eyes open on the acceptance gauntlet. |
| Contra Freelance/Contract Marketplace | niche_feeds | **manual_recommend** | no | yes | Passive profile, free plan; not an adapter. |
| Clutch / DesignRush / GoodFirms / Sortlist (Agency dirs) | agency_subcontract | **deprioritize** | no | restricted | Free to browse, ToS-safe only if purely manual; doesn't expose contacts cleanly. Low automation value. |
| Slack Communities (Agency Owner & Freelancer) | agency_subcontract | **deprioritize** | no | restricted | Legit but low-yield manual; ToS-blocks automation. |
| Indie Hackers | communities | **deprioritize** | no | yes | Low-priority manual long game; reply with value, DM founders seeking technical help. |
| Next.js Community (Discord + GitHub Discussions) | communities | **deprioritize** | partial | restricted | Credibility/inbound asset, not a pipeline. |
| LangChain Community Slack | communities | **deprioritize** | no | yes | Long-game brand surface; genuine participation only. Not a lead source. |
| Anthropic Claude Developer Community (Discord) | communities | **deprioritize** | no | yes | Credibility + learning venue; post polished builds in project-showcase. Not a lead channel. |
| Model Context Protocol (MCP) Community Discord | communities | **deprioritize** | no | restricted | Not lead-gen, not ToS-safe to automate. Residual credibility only. |
| CrewAI Community Discord | communities | **deprioritize** | no | yes | LOW & slow but free; manual long-horizon credibility. |
| Product Hunt Community (Discord + Web) | communities | **deprioritize** | partial | yes | Useful only if he ships an actual product; otherwise low value. |
| GitHub Sponsors + Open-Source Community | communities | **deprioritize** | yes | no | Portfolio/credibility asset, not a revenue/lead channel. |
| Substack Tech Newsletters Community | communities | **deprioritize** | partial | restricted | Long-term personal brand asset; slow leverage. |
| Hashnode | inbound_content | **deprioritize** | no | yes | Do NOT build a publishing adapter — free GraphQL write paywalled June 11 2026 ($7/mo). |
| SEO for Hire-Intent Keywords | inbound_content | **deprioritize** | partial | restricted | Not a reject: do on-page SEO + JSON-LD + GSC as one-time hygiene (after the domain move). Slow. |
| Product Hunt Launch | inbound_content | **deprioritize** | no | restricted | Sign-up not geo-blocked, but maker-audience + same-region upvote shadow-ban risk. |
| Awesome-Lists (GitHub Discovery) | inbound_content | **deprioritize** | no | yes | One manual PR to developer-portfolios for a free backlink; otherwise low. |
| Arc.dev | marketplaces | **deprioritize** | no | restricted | Legit/free/0% but structurally incompatible with his profile (experience + automation). |
| Wellfound (AngelList Talent) | marketplaces | **deprioritize** | no | restricted | Real/free to apply manually; no ToS-permitted feed; VPN lock risk. |
| Guru | marketplaces | **deprioritize** | no | yes | Alive/free/geo-OK but manual-only, 10 bids/mo cap. Lean on AI niche if tried. |
| Workana | marketplaces | **deprioritize** | no | restricted | Wrong pond — LATAM-language, LATAM-rate work. |
| Twine | marketplaces | **deprioritize** | no | restricted | Legit/free but creative-skewed, thin/stale dev listings. |
| Remotive | marketplaces | **deprioritize** | partial | yes | Fine as a manual job-seeking bookmark; free API ToS-bans outreach use. |
| Andela | marketplaces | **deprioritize** | no | restricted | Alive/well-funded/free but hard 4-yr experience floor. Revisit in ~2 yrs. |
| Hasjob India-Based Job Board RSS | niche_feeds | **deprioritize** | yes | restricted | Roles skew India-resident; offshore PK competes against the India pool. |
| Cryptocurrencyjobs.co | niche_feeds | **deprioritize** | partial | yes | Manual only (personal RSS reader); do not wire into the pipeline. |
| Wellfound Startup Jobs & Equity Board | niche_feeds | **deprioritize** | no | restricted | Do NOT build an adapter — anti-bot 403, "data harvesting" = permanent ban. |
| smithery.ai (MCP Server Registry) | oss_tools | **deprioritize** | yes | yes | Small one-time manual listing as a credibility artifact, not an automated lead source. |
| skills.sh (Vercel Agent Skills Registry) | oss_tools | **deprioritize** | no | yes | Free/geo-open; list a skill for credibility. Not a lead feed. |
| SkillsMP (Community Skills Registry) | oss_tools | **deprioritize** | yes | yes | Real/free; small indirect branding use only. |
| awesome-mcp (GitHub Awesome List) | oss_tools | **deprioritize** | yes | yes | Free/clean backlink, but low yield as a channel. |
| Show HN (Hacker News) | oss_tools | **deprioritize** | partial | yes | Credibility play, not a lead channel. Build 50 karma, ship one OSS AI/MCP tool, post Tue–Thu AM PT. |
| Product Hunt | oss_tools | **deprioritize** | partial | yes | Single well-prepared manual launch of one polished free AI tool, after build-in-public warm-up. |
| Contributing to Official Anthropic Repos | oss_tools | **deprioritize** | partial | yes | Slow-burn personal-brand/portfolio play, not client-acquisition. |
| Indie Hackers Jobs/Hiring | reddit_forums | **deprioritize** | partial | yes | Occasional manual inbound/brand touch, not a lead source. |
| dev.to Community (Jobs Tag + RSS) | reddit_forums | **deprioritize** | yes | yes | Do NOT build a dedicated adapter — content, not contacts. |
| Contra (Zero Commission) | reddit_forums | **deprioritize** | no | yes | ~1–2 hrs once for a free AI-loaded profile; no adapter. |
| Wellfound (Startup Jobs) | reddit_forums | **deprioritize** | no | restricted | Optional low-priority manual; no VPN at signup. Not automation. |
| Gun.io Elite Freelance Platform | reddit_forums | **deprioritize** | no | restricted | Real/free/low-ban but mis-tiered on geography; one-time manual attempt at most. |
| Upwork (Already Using) | reddit_forums | **deprioritize** | partial | yes | Existing manual platform; do NOT build a scraper/auto-bidder (fastest path to a ban). |
| OPEN Silicon Valley (Pakistani Diaspora) | regional_warm | **deprioritize** | no | restricted | Best as a manual targeting LIST of PK-heritage founders/CTOs, not an automated channel. |
| Pakistani Developer Communities (DevsPK etc.) | regional_warm | **deprioritize** | no | yes | Low-effort manual networking/referral only; not automatable. |
| Pakistan AI Startup Ecosystem (newsletters/RSS) | regional_warm | **deprioritize** | yes | restricted | Cheap RSS adapter if built anyway (rank 7); PK-currency-skewed. |
| WhatsApp Freelancer Groups (PK founders) | regional_warm | **deprioritize** | no | yes | Redirect to vetted PakLaunch; slow manual relationship play, not lead-gen. |
| LinkedIn + Sales Navigator (Paid) | agency_subcontract | **reject** | no | restricted | Sales Nav is paid (fails zero-budget) + scraping-banned. Salvage: manual search for agencies advertising overflow help. |
| Y Combinator — All Things YC Discord | communities | **reject** | no | restricted | No client demand; point at servers with #for-hire/#jobs instead. |
| Codeable | marketplaces | **reject** | no | yes | WordPress/WooCommerce-only — his entire differentiator is irrelevant. |
| Pangian | marketplaces | **reject** | no | unknown | Dead three ways: offline, no feed, paywalled. Skip. |
| Mastodon #hiring Hashtag RSS | niche_feeds | **reject** | yes | yes | Over-sold: no usable contacts; ToS restricts automated reading. |
| Mastodon #remote-work Hashtag RSS | niche_feeds | **reject** | yes | restricted | Host ToS restricts the consumption use; registration closed. |
| Mastodon #freelance Hashtag RSS | niche_feeds | **reject** | yes | yes | Near-zero signal for tech freelancing; only compliant use is a human RSS reader. |
| theresanaiforthat.com (TAAFT) | oss_tools | **reject** | no | yes | GTM channel for AI-tool MAKERS, not a lead source for service freelancers. |
| futuretools.io | oss_tools | **reject** | no | restricted | Low ban-risk but a product-marketing channel; no contact/job data. |
| futurepedia.io | oss_tools | **reject** | no | restricted | Product-marketing for AI SaaS founders; can't become an adapter. |
| Lobste.rs Community | reddit_forums | **reject** | partial | restricted | High-quality tech-discussion forum; hiring is rare. Not worth an adapter. |
| Pakistan-U.S. Alumni Network (PUAN) + Riphah Alumni | regional_warm | **reject** | no | restricted | Salvage near zero; at most ordinary warm LinkedIn outreach to a few alumni. |

---

*Generated from a verified multi-agent research run (run id `wf_c3d40279-877`, 99 agents). Raw
verifier notes for any channel can be regenerated from the workflow result if deeper detail is needed.*
