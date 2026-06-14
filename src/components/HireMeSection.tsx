"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Users,
  ScanLine,
  ClipboardCheck,
  CheckCircle2,
  ExternalLink,
  Rocket,
} from "lucide-react";
import { motion } from "framer-motion";
import { AnimatedSection } from "@/components/AnimatedSection";
import SectionWrapper from "@/components/SectionWrapper";
import { PERSONAL_INFO, PORTFOLIO_CONTENT } from "@/constants/data";

const HireMeSection = () => {
  const ctaUrl = `mailto:${PERSONAL_INFO.email}`;
  const hireMeContent = PORTFOLIO_CONTENT.engagement.hireMe;

  // Icons line up with the four hireMe.features in data.ts:
  // Audit-Ready Registers, RFID & Barcode Tagging, Inventory Accuracy, Team & Site Supervision.
  const featureIcons = [ClipboardCheck, ScanLine, CheckCircle2, Users];

  return (
    <SectionWrapper
      id="hire-me"
      eyebrow=""
      title={hireMeContent.title}
      description={hireMeContent.description}
    >
      <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Features Grid */}
          <AnimatedSection delay={0.2}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {hireMeContent.features.map((feature, index) => {
                const Icon = featureIcons[index] || CheckCircle2;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Card className="group h-full hover:shadow-lg transition-all duration-300 hover:border-primary/50 bg-card/50 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-2">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </AnimatedSection>

          {/* CTA Card */}
          <AnimatedSection delay={0.3}>
            <Card className="h-full bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 overflow-hidden relative group">
              {/* Background gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <CardContent className="p-8 relative z-10 flex flex-col justify-between h-full">
                <div>
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    viewport={{ once: true }}
                    className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors"
                  >
                    <Rocket className="w-10 h-10 text-primary" />
                  </motion.div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
                    {hireMeContent.ctaTitle}
                  </h3>
                  <p className="text-muted-foreground mb-8 leading-relaxed">
                    {hireMeContent.ctaDescription}
                  </p>
                </div>

                <div>
                  {/* Platform Button */}
                  <motion.a
                    href={ctaUrl}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="block"
                  >
                    <Button
                      size="lg"
                      className="w-full h-14 text-base font-semibold bg-gradient-primary border-0 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all group"
                    >
                      <Briefcase className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                      {hireMeContent.buttonLabel}
                      <ExternalLink className="w-4 h-4 ml-auto group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </Button>
                  </motion.a>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
    </SectionWrapper>
  );
};

export default HireMeSection;
