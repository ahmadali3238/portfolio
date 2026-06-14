"use client";

import { useState, useEffect } from "react";
import {
  Home,
  User,
  ClipboardList,
  Briefcase,
  Award,
  Boxes,
  FileCheck,
  Mail,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const sectionLinks = [
  { href: "#profile", label: "Home", id: "profile", icon: Home },
  { href: "#about", label: "About", id: "about", icon: User },
  { href: "#skills", label: "Skills", id: "skills", icon: ClipboardList },
  { href: "#experience", label: "Experience", id: "experience", icon: Briefcase },
  { href: "#certifications", label: "Certs", id: "certifications", icon: Award },
  { href: "#projects", label: "Engagements", id: "projects", icon: Boxes },
  { href: "#hire-me", label: "Hire Me", id: "hire-me", icon: FileCheck },
  { href: "#contact", label: "Contact", id: "contact", icon: Mail },
];

export default function Navigation() {
  const [activeSection, setActiveSection] = useState("profile");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);

      const scrollPosition = window.scrollY + window.innerHeight / 3;
      for (const section of sectionLinks) {
        const element = document.getElementById(section.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed left-0 top-1/2 z-40 hidden -translate-y-1/2 md:block">
      <TooltipProvider delayDuration={150}>
        <motion.nav
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          aria-label="Section navigation"
          className="flex flex-col items-start gap-1.5 py-3"
        >
          {sectionLinks.map((link) => {
            const isActive = activeSection === link.id;
            const Icon = link.icon;

            return (
              <Tooltip key={link.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => scrollToSection(link.href)}
                    aria-current={isActive ? "location" : undefined}
                    className={`flex items-center gap-2 rounded-r-lg border-l-2 py-2 pl-3 pr-4 transition-all duration-200 ${
                      isActive
                        ? "border-l-primary bg-primary/10 text-primary"
                        : "border-l-transparent text-muted-foreground/60 hover:border-l-border hover:bg-accent/50 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span
                      className={`text-xs font-medium transition-all duration-200 ${
                        isActive ? "w-auto opacity-100" : "w-0 overflow-hidden opacity-0"
                      }`}
                    >
                      {link.label}
                    </span>
                  </button>
                </TooltipTrigger>
                {!isActive && (
                  <TooltipContent side="right" sideOffset={8}>
                    {link.label}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </motion.nav>
      </TooltipProvider>
    </div>
  );
}
