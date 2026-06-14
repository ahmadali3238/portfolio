import { redirect } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** Only allow internal admin paths as a redirect target (prevents open-redirect). */
function safeNext(next: unknown): string {
  if (typeof next === "string" && /^\/admin(\/|$)/.test(next) && !next.startsWith("//")) {
    return next;
  }
  return "/admin/blog";
}

export default function AdminLoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = safeNext(searchParams?.next);
  const session = getAdminSession();

  if (session) {
    redirect(next);
  }

  return (
    <SiteShell>
      <main
        id="main-content"
        className="mx-auto flex min-h-[70vh] max-w-6xl items-center px-4 py-20 sm:px-6 lg:px-8"
      >
        <AdminLoginForm next={next} />
      </main>
    </SiteShell>
  );
}
