# Ahmad Ali — Portfolio + Job Finder

A modern personal portfolio for **Ahmad Ali**, an Asset Planning / Fixed Asset / Inventory Specialist (RFID asset tracking) based in Dubai, UAE — with a built-in **Job Finder automation** that aggregates UAE/GCC asset & inventory job listings.

[![Portfolio](https://img.shields.io/badge/Portfolio-Live-success?style=for-the-badge)](https://ahmadali3238.vercel.app/)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/ahmadali3238)

## Highlights

- **Recruiter-first portfolio** — hero, about, core competencies, experience timeline, certifications, and **Key Engagements** (RFID tagging, broadcast asset planning, warehouse turnaround) written for UAE asset/inventory hiring managers and keyword-dense for recruiter searches.
- **Runtime résumé download** — a clean PDF résumé generated on demand from a single data file.
- **AI assistant** — answers recruiter questions about Ahmad; works offline with no API key, upgrades to full LLM answers with a free Groq key.
- **Job Finder automation** — discovers UAE/GCC asset, inventory, warehouse, and RFID job listings from free job APIs, scores them against Ahmad's profile, and emails a daily digest + an admin review dashboard. Drafts tailored application notes for Ahmad to review and send.
- **Personalized recruiter landing pages** — `…/for/their-company` greets a specific employer by name.

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS + shadcn/ui · Framer Motion · Supabase (optional, for the Job Finder) · Groq/Gemini (optional AI) · `@react-pdf/renderer`.

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

The site **runs and builds with no environment variables**. Add keys from `.env.example` only to switch on the AI assistant (Groq), the contact form (EmailJS), or the Job Finder (Supabase + a free job API key). See `.env.example` for the full, commented list.

```bash
pnpm build        # production build
pnpm start        # serve the production build
```

## Editing your content

Almost everything you'll want to change lives in **two files**:

- `src/constants/data.ts` — your name, title, summary, experience, skills, certifications, languages, contact details, and SEO. Edit here and it updates the whole site, the résumé PDF, the AI assistant, and the structured data.
- `src/constants/projects-data.ts` — your **Key Engagements**. Add your real metrics where the `TO-CONFIRM` comments mark them.

Replace the placeholder profile/cover images in `public/` with your own photos.

## Deploy

Deploy to **Vercel** (one click from a GitHub repo). The AI chat, Job Finder, personalized landing pages, and admin dashboard need a server runtime, so a static host (e.g. GitHub Pages) won't run those parts.

See `CLAUDE.md` for the full architecture and `HANDOFF.md` for the punch-list of what to confirm and how to switch each feature on.
