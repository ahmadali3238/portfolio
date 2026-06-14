"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Boxes,
  ClipboardList,
  ScanLine,
  ClipboardCheck,
  Warehouse,
  Cog,
} from "lucide-react";
import { motion } from "framer-motion";
import { StaggerContainer } from "@/components/AnimatedSection";
import SectionWrapper from "@/components/SectionWrapper";
import { SKILL_CATEGORIES, type SkillCategory } from "@/constants/data";

// Internal ids are stable; icons map to Ahmad's re-skinned categories:
// frontend=Fixed Asset Mgmt, backend=Inventory & Stock, databases=RFID & Asset
// Tracking, aiMl=Audit & Reporting, mobile=Warehouse & Logistics, tooling=Systems.
const CATEGORY_ICONS: Record<SkillCategory["id"], LucideIcon> = {
  frontend: Boxes,
  backend: ClipboardList,
  databases: ScanLine,
  aiMl: ClipboardCheck,
  mobile: Warehouse,
  tooling: Cog,
};

interface SkillCardProps {
  readonly title: string;
  readonly skills: readonly { name: string; level: string }[];
  readonly icon: LucideIcon;
}

function SkillCard({ title, skills, icon: Icon }: SkillCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      viewport={{ once: true }}
    >
      <Card className="group hover:shadow-glow transition-all duration-500 bg-gradient-card border-0 relative overflow-hidden h-full">
        <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
        <CardHeader className="pb-4 relative z-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <motion.div
              className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-300"
              whileHover={{ scale: 1.1, rotate: 10 }}
            >
              <Icon className="w-6 h-6 text-primary" />
            </motion.div>
            <CardTitle className="text-xl font-semibold text-center text-foreground group-hover:text-primary transition-colors duration-300">
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {skills.map((skill) => (
              <motion.div
                key={skill.name}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-all duration-200 group/skill"
              >
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 group-hover/skill:animate-pulse" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate group-hover/skill:text-primary transition-colors duration-200">
                    {skill.name}
                  </h4>
                  <Badge
                    variant={
                      skill.level === "Experienced" ? "default" : "secondary"
                    }
                    className="text-xs mt-1 group-hover/skill:scale-105 transition-transform duration-200"
                  >
                    {skill.level}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </StaggerContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function SkillsSection() {
  return (
    <SectionWrapper id="skills" eyebrow="Explore My" title="Skills" muted>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 items-stretch">
        {SKILL_CATEGORIES.map((category) => (
          <SkillCard
            key={category.id}
            title={category.title}
            skills={category.items}
            icon={CATEGORY_ICONS[category.id]}
          />
        ))}
      </div>
    </SectionWrapper>
  );
}
