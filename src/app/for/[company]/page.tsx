import { leadByCompanySlug } from "@/lib/outreach/repository";
import { PERSONAL_INFO, SITE_URL } from "@/constants/data";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
// Per-lead landing pages must never be indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Tailored per-employer landing page. Doubles as a first-party engagement signal —
 *  send a recruiter `yoursite.com/for/their-company` and they land on a page that
 *  greets their company by name (and references a seeded `signal` if present). */
export default async function ForCompanyPage({ params }: { params: { company: string } }) {
  let lead: any = null;
  try { lead = await leadByCompanySlug(params.company); } catch { /* ignore */ }
  const company = lead?.company_name || params.company.replace(/-/g, " ");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-sm uppercase tracking-widest text-muted-foreground">For the {company} team</p>
      <h1 className="text-3xl font-bold sm:text-4xl">
        I keep your asset registers accurate and audit-ready.
      </h1>
      <p className="text-lg text-muted-foreground">
        I&apos;m {PERSONAL_INFO.name} — an Asset Planning, Fixed Asset &amp; Inventory Specialist
        based in Dubai with 7+ years across RFID asset tagging, fixed-asset inventory and audit,
        cycle counting, and warehouse operations. I keep physical inventory reconciled to system
        records, registers inspection-ready, and high-value assets tracked end to end.
      </p>
      {lead?.signal ? (
        <p className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
          Saw this about {company}: <span className="italic">{lead.signal}</span> — I&apos;ve done
          exactly this kind of asset and inventory work and would be glad to help.
        </p>
      ) : null}
      <ul className="grid gap-2 text-sm">
        <li>• RFID fixed-asset tagging &amp; audit across multiple client sites — accurate, reconciled registers</li>
        <li>• Broadcast &amp; live-production asset planning at NEP Middle East — the right gear, ready, every production</li>
        <li>• Warehouse supervisor promoted to Asset Planning — disciplined shipping/receiving and stock accuracy</li>
      </ul>
      <div className="flex flex-wrap gap-3">
        <a href={SITE_URL} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
          View portfolio
        </a>
        <a href={`mailto:${PERSONAL_INFO.email}`} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium">
          Get in touch
        </a>
      </div>
    </main>
  );
}
