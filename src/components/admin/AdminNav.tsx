"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Send, FolderGit2, ExternalLink } from "lucide-react";

const TABS = [
  { href: "/admin/outreach", label: "Job Finder", icon: Send },
  { href: "/admin/projects", label: "Engagements", icon: FolderGit2 },
];

export default function AdminNav() {
  const pathname = usePathname() || "";
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/60 p-1.5 backdrop-blur">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
      <Link
        href="/"
        className="ml-auto flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ExternalLink className="h-4 w-4" />
        <span className="hidden sm:inline">View site</span>
      </Link>
    </nav>
  );
}
