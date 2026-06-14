import SiteShell from "@/components/SiteShell";
import AdminNav from "@/components/admin/AdminNav";
import AddProjectGuide from "@/components/admin/AddProjectGuide";
import { requireAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default function AdminProjectsPage() {
  const session = requireAdminSession("/admin/projects");

  return (
    <SiteShell>
      <main id="main-content" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <AdminNav />
          <AddProjectGuide adminEmail={session.email} />
        </div>
      </main>
    </SiteShell>
  );
}
