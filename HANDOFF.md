# Ahmad — Read Me First (Handoff)

Your portfolio website is built and working. It's modelled on Muhammad Abdullah's portfolio, re-skinned entirely for you, with the **blog feature removed** and a **job-finding automation** added (as you asked). This file tells you what's done, the few things only **you** can confirm, and how to put it live.

---

## 1. What you got

A professional portfolio site that presents you as an **Asset Planning / Fixed Asset / Inventory Specialist (RFID)** in Dubai, with:

- **Hero** — your name, specialist title, "7+ years", and quick contact (LinkedIn, email, WhatsApp).
- **About** — your professional summary + an Education card + animated "7+ Years / RFID Asset Tracking" badges.
- **Core Competencies** — your skills grouped into 6 areas: Fixed Asset Management · Inventory & Stock Control · RFID & Asset Tracking · Audit, Reconciliation & Reporting · Warehouse & Logistics · Systems, Tools & Leadership.
- **Experience** — all 5 of your roles (NEP Asset Planning, NEP Warehouse, Acube RFID, Toyota, Chieftain Hotel).
- **Certifications** — Microsoft Office (TEVTA) and the Quantity Surveyor course.
- **Key Engagements** — 4 case-study cards (RFID tagging rollout · broadcast asset planning · warehouse → promotion · 25-vehicle delivery), each with its own detail page.
- **Hire Me / Contact** — availability (1-month notice, transferable visa, Dubai), a contact form, and your links.
- **A downloadable PDF résumé**, generated live from your details.
- **An AI assistant** that answers recruiter questions about you.
- **A Job Finder** that automatically collects UAE asset/inventory/warehouse jobs for you.

The site is **mobile-friendly, dark/light themed, SEO-optimized** for the exact phrases UAE recruiters search ("Fixed Asset Specialist Dubai", "Inventory Controller UAE", "RFID Asset Tracking", etc.), and it **builds cleanly** (verified).

---

## 2. ⚠️ Things ONLY YOU can confirm (do these first)

Everything on the site today is **true to your CV** — I did **not** invent any numbers. But your portfolio will be far stronger if you add a few **real, verifiable** figures. Search the code for `TO-CONFIRM` (mainly in `src/constants/projects-data.ts`) and fill in your actual numbers:

| Where | What to add (your real figure) |
|---|---|
| RFID engagement | How many assets you tagged (e.g. "20,000+"), across how many client sites, the register accuracy you reached (e.g. "98%+"), and how much you cut count time vs manual. |
| Warehouse → promotion | A stock/dispatch accuracy %, time-to-promotion, or the value of the asset portfolio you took on. |
| Hero / About | If you want a headline metric (e.g. inventory accuracy %), tell me and I'll add an "Impact" strip. |

> **Rule:** never put a number you can't back up in an interview. A confirmed conservative number beats an impressive guess.

**Also confirm these details** (currently taken from your CV — change in `src/constants/data.ts` if needed):
- Email: `ahmadalibusiness3238@gmail.com` · Phone/WhatsApp: `+971 56 5756141` · LinkedIn: `linkedin.com/in/ahmadali3238`
- **Photos:** the profile and cover images are neutral placeholders. Add a professional headshot (`public/placeholder.png`) and, ideally, anonymized photos of tagged assets / count sheets / a dashboard for the engagement cards — recruiters rarely see operational proof, and it lands hard.

---

## 3. How to run it & put it live

```bash
cd Ahmad-Ali/portfolio
pnpm install
pnpm dev        # opens http://localhost:3000 — preview locally
```

**To publish it** (recommended: free Vercel):
1. Push this folder to a GitHub repository.
2. Go to vercel.com → "New Project" → import that repo → Deploy. Done — you get a live URL.
3. (Optional) point your own domain at it in Vercel's settings.

> Your CV lists `ahmadali3238.github.io/portfolio`. GitHub Pages can't run the AI chat, Job Finder, or admin (they need a live server), so **use Vercel** for the full experience. I set the site's address to `https://ahmadali3238.vercel.app` as a placeholder — change it in `src/constants/data.ts` (`portfolio:`) and the `NEXT_PUBLIC_SITE_URL` env var once you know your real URL.

The site works with **zero setup**. The features below are optional add-ons.

---

## 4. Switching on the optional features

Copy `.env.example` to `.env.local` and fill in only the sections you want. All keys are optional.

| Feature | What it needs | Notes |
|---|---|---|
| **AI assistant (full)** | `GROQ_API_KEY` (free at console.groq.com) | Works **without** a key using a built-in offline knowledge base; the key just upgrades the answers. |
| **Contact form** | 3 `NEXT_PUBLIC_EMAILJS_*` keys (free at emailjs.com) | Create a template with fields `from_name, user_email, message, reply_to, date` pointed at your inbox. |
| **Job Finder + admin** | Supabase (free) + `ADMIN_*` login + at least one job-API key | See section 5. |

---

## 5. The Job Finder (your must-have automation)

**What it does:** every day it searches the **UAE/GCC** job market for **asset, fixed-asset, inventory, stock, warehouse, and RFID** roles, scores each listing against your profile, saves the good ones, and can **email you a digest** of new matches. You review them in a private `/admin` dashboard, and it can **pre-draft a tailored application note** for each — you read it and send it yourself.

**Why it works this way (important):** the original tool cold-emailed employers automatically. In the UAE that's legally risky (the PDPL / anti-spam rules require opt-in consent, with large fines). So I deliberately set it up to **bring the jobs to you** and **draft** applications for your review — safe, legal, and genuinely useful for a job seeker. Nothing is sent automatically (`sendMode` is `"draft"`).

**To turn it on:**
1. Create a free **Supabase** project; run the SQL files in `supabase/migrations/` (the `*outreach*` ones).
2. Sign up for one or more **free job APIs** and add the keys to `.env.local`:
   - **JSearch** (RapidAPI / OpenWeb Ninja) — Google-for-Jobs, covers UAE → `JSEARCH_API_KEY`
   - **Careerjet** (free affiliate, UAE locale) → `CAREERJET_AFFID`
   - **Jooble** (free key, 33k+ UAE jobs) → `JOOBLE_API_KEY`
3. (Optional) add `RESEND_API_KEY` to get the email digest.
4. Run it:
   ```bash
   pnpm outreach:source     # find new UAE jobs now
   pnpm outreach:run        # full pipeline (still draft-only; nothing auto-sends)
   ```
   Settings (keywords, target countries, etc.) are in `scripts/outreach/outreach.config.json` — already tuned for your field; edit freely.
5. (Optional) drop your CV at `scripts/outreach/assets/resume.pdf` (or set `resumeUrl` in the config) so generated application notes can attach or link it when a posting asks.

> Note: the three job sources only return listings once their free API keys are in `.env.local`. Until then the pipeline runs but finds nothing — that's expected and safe.

Even before you wire this up, you can find jobs manually on **Bayt, LinkedIn (location: Dubai), Indeed UAE, GulfTalent, NaukriGulf**, and register with recruiters **Michael Page, Hays, Robert Half, Cooper Fitch**.

---

## 6. Recommended next steps to win interviews (from the market research)

- **Certifications that pay off** (highest impact first): **APICS CPIM** (inventory/planning — the big one for your field), an **asset-management / ISO 55000 (IAM/CAMA)** cert, and an **EAM/CMMS** skill like **IBM Maximo or SAP** (unlocks oil & gas, utilities, healthcare). Certified supply-chain pros earn ~17–25% more.
- **Target titles** beyond your current one: Inventory Controller, Fixed Asset Specialist/Accountant, Stock/Materials Controller, Asset Management Specialist, Warehouse Supervisor, Asset Coordinator.
- **Realistic UAE pay band** for your level: ~AED 12,000–20,000/month core, up to 25,000+ in oil & gas / large 3PL / MNC roles.
- **Mirror the site's keywords** on your LinkedIn headline and "About" so recruiter searches find you; set your location to **Dubai** (city beats country).

Full research is in the `_analysis/` folder (8 detailed reports) if you or a developer want the sources.

---

## 7. Where things live (for a developer)

- Your content → `src/constants/data.ts` and `src/constants/projects-data.ts`
- Look & colours → `src/app/globals.css` (the `--primary` brand colour)
- AI assistant knowledge → auto-generated from `data.ts` (`src/constants/knowledgeBase.ts`)
- Job Finder → `scripts/outreach/` (config in `outreach.config.json`)
- Architecture overview → `CLAUDE.md`

Questions or changes? Just describe what you want and it can be adjusted.
