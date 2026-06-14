import AdminNav from "@/components/admin/AdminNav";
import OutreachDashboard from "@/components/admin/OutreachDashboard";
import { requireAdminSession } from "@/lib/admin-auth";
import { getOutreachLeads, getOutreachStats, hasOutreachConfig } from "@/lib/outreach/repository";

export const dynamic = "force-dynamic";

export default async function AdminOutreachPage() {
  const session = requireAdminSession("/admin/outreach");
  const configured = hasOutreachConfig();
  // Fetch the SAME set the dashboard's default "Review Desk" shows (to_review, all lanes) so the
  // first paint hydrates from SSR instead of refetching on mount.
  const [leads, stats] = configured
    ? await Promise.all([getOutreachLeads({ status: "to_review" }).catch(() => []), getOutreachStats().catch(() => null)])
    : [[], null];

  // No public SiteShell here — this is a private ops tool, not a marketing page. AdminNav is the
  // tool's own nav; the portfolio header/footer + "Hire Me" CTA don't belong on a work dashboard.
  return (
    <div className="min-h-screen bg-background">
      <main id="main-content" className="px-3 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <AdminNav />
          <OutreachDashboard
            initialLeads={leads}
            initialStats={stats}
            configured={configured}
            adminEmail={session.email}
          />
        </div>
      </main>
    </div>
  );
}
