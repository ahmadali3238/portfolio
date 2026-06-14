"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { motion } from "framer-motion";
import CertificateCarousel from "@/components/CertificateCarousel";
import { FadeInCard } from "@/components/motion/FadeInCard";
import { FadeInSection } from "@/components/motion/FadeInSection";
import SectionWrapper from "@/components/SectionWrapper";
import {
  CERTIFICATE_IMAGES,
  CERTIFICATES_DISPLAY as CERTIFICATES,
  CERTIFICATION_CATEGORIES,
  type CertificationCategory,
} from "@/constants/data";
import { cn } from "@/lib/utils";

interface CategoryToggleProps {
  active: CertificationCategory;
  onChange: (category: CertificationCategory) => void;
  /** Unique per rendered instance so each pill animates independently. */
  layoutId: string;
  className?: string;
}

function CategoryToggle({
  active,
  onChange,
  layoutId,
  className,
}: CategoryToggleProps) {
  return (
    <div className={cn("flex justify-center", className)}>
      <div
        role="tablist"
        aria-label="Certification categories"
        className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 p-1 backdrop-blur-sm"
      >
        {CERTIFICATION_CATEGORIES.map((category) => {
          const isActive = category.id === active;

          return (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(category.id)}
              className={cn(
                "relative rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300 sm:px-6",
                isActive
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 rounded-full bg-gradient-primary shadow-glow"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10">{category.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CertificationsSection() {
  const [activeCategory, setActiveCategory] = useState<CertificationCategory>(
    CERTIFICATION_CATEGORIES[0].id
  );

  const visibleCertificates = useMemo(
    () => CERTIFICATES.filter((cert) => cert.category === activeCategory),
    [activeCategory]
  );

  const visibleImages = useMemo(
    () => CERTIFICATE_IMAGES.filter((cert) => cert.category === activeCategory),
    [activeCategory]
  );

  return (
    <SectionWrapper id="certifications" eyebrow="Explore My" title="Certifications" muted>
      <div className="mb-20">
        <h3 className="text-2xl font-semibold text-center mb-6 text-foreground">
          Professional Certifications
        </h3>
        {CERTIFICATION_CATEGORIES.length > 1 && (
          <CategoryToggle
            active={activeCategory}
            onChange={setActiveCategory}
            layoutId="cert-category-pill-cards"
            className="mb-12"
          />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {visibleCertificates.map((cert, index) => (
            <FadeInCard key={`${activeCategory}-${cert.title}`} index={index}>
              <Card className="group hover:shadow-elegant transition-all duration-300 card-elevated h-full">
                <CardHeader className="pb-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors duration-300">
                      {cert.title}
                    </h4>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">{cert.duration}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {cert.description}
                  </p>
                </CardContent>
              </Card>
            </FadeInCard>
          ))}
        </div>
      </div>

      {visibleImages.length > 0 && (
        <FadeInSection>
          <h3 className="text-2xl font-semibold text-center mb-6 text-foreground">
            Certificate Gallery
          </h3>
          <CategoryToggle
            active={activeCategory}
            onChange={setActiveCategory}
            layoutId="cert-category-pill-gallery"
            className="mb-12"
          />
          {/* key remounts the carousel so its internal index resets on switch */}
          <CertificateCarousel key={activeCategory} certificates={visibleImages} />
        </FadeInSection>
      )}
    </SectionWrapper>
  );
}
