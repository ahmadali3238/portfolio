import Link from "next/link";
import { PERSONAL_INFO } from "@/constants/data";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Engagements" },
  { href: "/#contact", label: "Contact" },
  { href: "/#hire-me", label: "Hire Me" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <nav
          aria-label="Footer"
          className="flex flex-wrap justify-center gap-x-8 gap-y-3"
        >
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative text-sm text-muted-foreground transition-colors duration-200 hover:text-primary"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {PERSONAL_INFO.name}. All Rights
          Reserved.
        </p>
      </div>
    </footer>
  );
}
