import { cn } from "@/lib/utils";

interface SectionWrapperProps {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly description?: string;
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly muted?: boolean;
}

export default function SectionWrapper({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
  muted,
}: SectionWrapperProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={cn(
        "section-padding relative overflow-hidden",
        muted && "bg-muted/20",
        className,
      )}
    >
      <div className="container-content relative z-10">
        <div className="mb-16 text-center">
          <p className="section-eyebrow">{eyebrow}</p>
          <h2 id={`${id}-heading`} className="heading-gradient">
            {title}
          </h2>
          {description && (
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
