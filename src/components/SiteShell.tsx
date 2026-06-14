import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";

interface SiteShellProps {
  children: React.ReactNode;
}

export default function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      {children}
      <Footer />
    </div>
  );
}
