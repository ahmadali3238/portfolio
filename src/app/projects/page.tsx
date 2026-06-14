import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FolderGit2, Layers3 } from "lucide-react";
import PageHero from "@/components/PageHero";
import ProjectsShell from "@/components/ProjectsShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PROJECTS, SITE_URL, getProjectUrl } from "@/constants/data";

export const metadata: Metadata = {
  title: "Engagements",
  description:
    "Key asset-management, RFID, inventory and warehouse engagements by Ahmad Ali.",
  alternates: {
    canonical: "/projects",
  },
  openGraph: {
    title: "Engagements | Ahmad Ali",
    description:
      "Key asset-management, RFID, inventory and warehouse engagements by Ahmad Ali.",
    url: `${SITE_URL}/projects`,
    type: "website",
  },
};

export default function ProjectsPage() {
  const categoryCount = new Set(PROJECTS.map((project) => project.category)).size;

  return (
    <ProjectsShell>
      <main id="main-content">
        <PageHero className="py-20">
          <div className="max-w-3xl">
            <p className="mb-2 text-lg text-muted-foreground">Browse the full</p>
            <h1 className="bg-gradient-hero bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
              Key Engagements
            </h1>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Asset-management, fixed-asset, RFID, inventory, and warehouse
              engagements spanning tagging, reconciliation, cycle counts, and
              process improvement.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 text-sm text-muted-foreground shadow-sm">
              <FolderGit2 className="h-4 w-4 text-primary" />
              <span>
                <span className="font-semibold text-foreground">
                  {PROJECTS.length}
                </span>{" "}
                engagements
              </span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 text-sm text-muted-foreground shadow-sm">
              <Layers3 className="h-4 w-4 text-primary" />
              <span>
                <span className="font-semibold text-foreground">
                  {categoryCount}
                </span>{" "}
                focus areas
              </span>
            </div>
          </div>
        </PageHero>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 xl:grid-cols-3">
            {PROJECTS.map((project) => (
              <Card
                key={project.slug}
                className="group flex h-full flex-col overflow-hidden border-0 bg-gradient-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elegant"
              >
                <Link href={getProjectUrl(project)} className="relative block overflow-hidden">
                  <Image
                    src={project.image}
                    alt={`Preview of ${project.title}`}
                    width={720}
                    height={480}
                    className="h-60 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </Link>

                <div className="flex flex-1 flex-col p-6">
                  <Badge
                    variant="secondary"
                    className="w-fit bg-primary/10 text-primary hover:bg-primary/10"
                  >
                    {project.category}
                  </Badge>

                  <h2 className="mt-4 text-2xl font-semibold leading-tight text-foreground">
                    <Link
                      href={getProjectUrl(project)}
                      className="transition-colors hover:text-primary"
                    >
                      {project.titleShort || project.title}
                    </Link>
                  </h2>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {project.duration}
                  </p>

                  <p className="mt-4 flex-1 text-sm leading-6 text-muted-foreground">
                    {project.description}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {project.technologies.slice(0, 4).map((technology) => (
                      <Badge
                        key={technology}
                        variant="outline"
                        className="border-border/70 bg-background/60 px-3 py-1 text-xs text-muted-foreground"
                      >
                        {technology}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-6">
                    <Button variant="secondary" className="group/button" asChild>
                      <Link href={getProjectUrl(project)}>
                        View engagement
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/button:translate-x-0.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </ProjectsShell>
  );
}
