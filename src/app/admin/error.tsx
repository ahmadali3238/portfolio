"use client";

import SiteShell from "@/components/SiteShell";
import ErrorCard from "@/components/ErrorCard";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SiteShell>
      <main className="flex min-h-[60vh] items-center justify-center px-4 py-20">
        <ErrorCard
          title="Admin panel error"
          description="The admin dashboard encountered an error. This could be a connectivity issue with the database or an unexpected server error."
          backHref="/admin/login"
          backLabel="Back to login"
          digest={error.digest}
          onRetry={reset}
        />
      </main>
    </SiteShell>
  );
}
