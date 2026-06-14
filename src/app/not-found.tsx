import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import SiteShell from "@/components/SiteShell";
import { Button } from "@/components/ui/button";
import { PERSONAL_INFO } from "@/constants/data";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: `The requested page could not be found on ${PERSONAL_INFO.name}'s portfolio.`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <SiteShell>
      <main
        id="main-content"
        className="flex min-h-[65vh] items-center justify-center px-4 py-24"
      >
        <div className="relative text-center">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -left-20 -top-20 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-primary-glow/5 blur-3xl" />
          </div>
          <div className="relative">
            <h1 className="bg-gradient-hero bg-clip-text text-7xl font-bold text-transparent sm:text-8xl">
              404
            </h1>
            <p className="mt-4 text-xl font-medium text-foreground">
              Page not found
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted-foreground">
              The page you&apos;re looking for doesn&apos;t exist or may have been moved.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/">
                  <Home className="h-4 w-4" />
                  Go home
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/blog">
                  <ArrowLeft className="h-4 w-4" />
                  Browse blog
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </SiteShell>
  );
}
