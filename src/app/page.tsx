import dynamic from "next/dynamic";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import SiteShell from "@/components/SiteShell";
import StructuredData from "@/components/StructuredData";

const AboutSection = dynamic(() => import("@/components/AboutSection"), {
  loading: () => <SectionSkeleton />,
});
const SkillsSection = dynamic(() => import("@/components/SkillsSection"), {
  loading: () => <SectionSkeleton />,
});
const ExperienceSection = dynamic(
  () => import("@/components/ExperienceSection"),
  { loading: () => <SectionSkeleton /> },
);
const CertificationsSection = dynamic(
  () => import("@/components/CertificationsSection"),
  { loading: () => <SectionSkeleton /> },
);
const ProjectsSection = dynamic(() => import("@/components/ProjectsSection"), {
  loading: () => <SectionSkeleton />,
});
const HireMeSection = dynamic(() => import("@/components/HireMeSection"), {
  loading: () => <SectionSkeleton />,
});
const ContactSection = dynamic(() => import("@/components/ContactSection"), {
  loading: () => <SectionSkeleton />,
});
const AIAssistantButton = dynamic(
  () => import("@/components/AIAssistantButton"),
  { ssr: false },
);

function SectionSkeleton() {
  return (
    <div className="animate-pulse px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-4 h-8 w-48 rounded bg-muted/50" />
        <div className="mx-auto mb-12 h-12 w-64 rounded bg-muted/50" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-lg bg-muted/30" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <SiteShell>
      <StructuredData />
      <Navigation />
      <main id="main-content">
        <HeroSection />
        <AboutSection />
        <SkillsSection />
        <ExperienceSection />
        <CertificationsSection />
        <ProjectsSection />
        <HireMeSection />
        <ContactSection />
      </main>
      <AIAssistantButton />
    </SiteShell>
  );
}
