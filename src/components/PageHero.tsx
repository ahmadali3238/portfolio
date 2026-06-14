import { cn } from "@/lib/utils";

interface PageHeroProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly maxWidth?: "4xl" | "6xl";
}

export default function PageHero({
  children,
  className,
  maxWidth = "6xl",
}: PageHeroProps) {
  const widthClass = maxWidth === "4xl" ? "max-w-4xl" : "max-w-6xl";

  return (
    <section
      className={cn(
        "relative overflow-hidden border-b border-border bg-muted/20 px-4 py-16 sm:px-6 sm:py-20 lg:px-8",
        className,
      )}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-12 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-primary-glow/10 blur-3xl" />
      </div>
      <div className={cn("relative mx-auto", widthClass)}>{children}</div>
    </section>
  );
}
