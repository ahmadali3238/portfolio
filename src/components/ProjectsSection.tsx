"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import ProjectCard from "@/components/ProjectCard";
import SectionWrapper from "@/components/SectionWrapper";
import { PROJECTS_PREVIEW } from "@/constants/data";
import { motion, AnimatePresence } from "framer-motion";

const INITIAL_COUNT = 6;

export default function ProjectsSection() {
  const [showAll, setShowAll] = useState(false);
  const displayedProjects = showAll
    ? PROJECTS_PREVIEW
    : PROJECTS_PREVIEW.slice(0, INITIAL_COUNT);
  const remainingCount = PROJECTS_PREVIEW.length - INITIAL_COUNT;

  return (
    <SectionWrapper id="projects" eyebrow="A Look At My" title="Key Engagements" muted>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {displayedProjects.map((project, index) => (
            <motion.div
              key={project.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <ProjectCard project={project} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {PROJECTS_PREVIEW.length > INITIAL_COUNT && (
        <motion.div
          className="flex justify-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          viewport={{ once: false }}
        >
          <Button
            onClick={() => setShowAll(!showAll)}
            className="px-8 py-2 text-base font-semibold"
            variant="outline"
          >
            {showAll ? (
              <>
                Show Less
                <ChevronUp className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Show More{" "}
                {remainingCount > 0 && `(${remainingCount} more engagements)`}
                <ChevronDown className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </motion.div>
      )}

      <div className="mt-8 text-center">
        <Link
          href="/projects"
          className="text-sm font-medium text-primary hover:underline"
        >
          Browse all engagements
        </Link>
      </div>
    </SectionWrapper>
  );
}
