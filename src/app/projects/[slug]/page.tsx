import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Github,
  Layers3,
  Lock,
  Sparkles,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import ProjectsShell from "@/components/ProjectsShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PERSONAL_INFO,
  PROJECTS,
  SITE_URL,
  getProjectBySlug,
  getProjectUrl,
} from "@/constants/data";

interface ProjectPageProps {
  params: {
    slug: string;
  };
}

export function generateStaticParams() {
  return PROJECTS.map((project) => ({
    slug: project.slug,
  }));
}

export function generateMetadata({ params }: ProjectPageProps): Metadata {
  const project = getProjectBySlug(params.slug);

  if (!project) {
    return {
      title: "Project Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${project.title} | Engagement`,
    description: project.seoDescription,
    keywords: project.technologies,
    alternates: {
      canonical: getProjectUrl(project),
    },
    openGraph: {
      title: `${project.title} | ${PERSONAL_INFO.name}`,
      description: project.seoDescription,
      url: `${SITE_URL}${getProjectUrl(project)}`,
      type: "article",
      images: [
        {
          url: project.image,
          alt: `Preview of ${project.title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${project.title} | ${PERSONAL_INFO.name}`,
      description: project.seoDescription,
      images: [project.image],
    },
  };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const project = getProjectBySlug(params.slug);

  if (!project) {
    notFound();
  }

  const pageUrl = `${SITE_URL}${getProjectUrl(project)}`;
  const relatedProjects = PROJECTS.filter(
    (item) => item.slug !== project.slug && item.category === project.category
  ).slice(0, 3);
  const projectFacts = [
    {
      label: "Category",
      value: project.category,
      icon: Layers3,
    },
    {
      label: "Timeline",
      value: project.duration,
      icon: CalendarDays,
    },
    {
      label: "Stack",
      value: `${project.technologies.length} core technologies`,
      icon: Sparkles,
    },
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareSourceCode",
        name: project.title,
        description: project.seoDescription,
        url: pageUrl,
        image: new URL(project.image, SITE_URL).toString(),
        codeRepository: project.github || undefined,
        programmingLanguage: project.technologies,
        creator: {
          "@type": "Person",
          name: PERSONAL_INFO.name,
          url: SITE_URL,
        },
        sameAs: [project.demo, project.website, project.github].filter(Boolean),
        keywords: project.technologies.join(", "),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Projects",
            item: `${SITE_URL}/projects`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: project.titleShort || project.title,
            item: pageUrl,
          },
        ],
      },
    ],
  };

  return (
    <ProjectsShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      <main id="main-content">
        <PageHero>
          <nav
            aria-label="Breadcrumb"
            className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
          >
            <Link href="/" className="transition-colors hover:text-primary">
              Home
            </Link>
            <span>/</span>
            <Link
              href="/projects"
              className="transition-colors hover:text-primary"
            >
              Projects
            </Link>
            <span>/</span>
            <span className="text-foreground">
              {project.titleShort || project.title}
            </span>
          </nav>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge
                  variant="secondary"
                  className="w-fit bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary hover:bg-primary/10"
                >
                  {project.category}
                </Badge>
                <h1 className="bg-gradient-hero bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
                  {project.title}
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                  {project.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" size="lg" asChild>
                  <Link href="/projects">
                    <ArrowLeft className="h-4 w-4" />
                    Back to archive
                  </Link>
                </Button>

                {project.demo ? (
                  <Button variant="hero" size="lg" asChild>
                    <a href={project.demo} target="_blank" rel="noopener noreferrer">
                      {project.demoLabel || "View project"}
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </Button>
                ) : null}

                {project.website && project.website !== project.demo ? (
                  <Button variant="outline" size="lg" asChild>
                    <a
                      href={project.website}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {project.websiteLabel || "Visit website"}
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </Button>
                ) : null}

                {project.github ? (
                  <Button variant="download" size="lg" asChild>
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Github className="h-4 w-4" />
                      View source
                    </a>
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {projectFacts.map(({ label, value, icon: Icon }) => (
                  <Card
                    key={label}
                    className="card-elevated"
                  >
                    <CardContent className="flex items-start gap-4 p-5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="mt-1 text-sm font-semibold leading-6 text-foreground">
                          {value}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="overflow-hidden border-0 bg-gradient-card shadow-elegant">
              <div className="relative">
                <Image
                  src={project.image}
                  alt={`Preview of ${project.title}`}
                  width={1440}
                  height={900}
                  className="h-full max-h-[520px] w-full object-cover"
                  priority
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/70 to-transparent p-6">
                  <p className="text-sm font-medium text-foreground">
                    Selected stack
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {project.technologies.slice(0, 4).map((technology) => (
                      <Badge
                        key={technology}
                        variant="outline"
                        className="border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground"
                      >
                        {technology}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </PageHero>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <article className="space-y-8">
              <Card className="border-0 bg-gradient-card shadow-card">
                <CardHeader>
                  <p className="text-sm font-medium text-muted-foreground">
                    Highlights
                  </p>
                  <CardTitle className="text-3xl">
                    Project snapshot
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {project.highlights.map((highlight) => (
                      <li
                        key={highlight}
                        className="flex gap-3 rounded-2xl bg-background/70 p-4"
                      >
                        <span className="mt-2 h-2.5 w-2.5 flex-none rounded-full bg-primary" />
                        <span className="text-sm leading-7 text-muted-foreground">
                          {highlight}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {project.caseStudySections.map((section) => (
                <Card
                  key={section.id}
                  className="border-0 bg-gradient-card shadow-card"
                >
                  <CardHeader>
                    <p className="text-sm font-medium text-muted-foreground">
                      {section.eyebrow}
                    </p>
                    <CardTitle className="text-3xl">{section.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {section.paragraphs?.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="leading-7 text-muted-foreground"
                      >
                        {paragraph}
                      </p>
                    ))}

                    {section.diagram ? (
                      <div className="rounded-2xl bg-background/80 p-4 font-mono text-sm leading-7 text-muted-foreground whitespace-pre-line">
                        {section.diagram}
                      </div>
                    ) : null}

                    {section.bullets?.length ? (
                      <ul className="space-y-3">
                        {section.bullets.map((bullet) => (
                          <li
                            key={bullet}
                            className="flex gap-3 rounded-2xl bg-background/70 p-4"
                          >
                            <span className="mt-2 h-2.5 w-2.5 flex-none rounded-full bg-primary" />
                            <span className="text-sm leading-7 text-muted-foreground">
                              {bullet}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {section.groups?.length ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        {section.groups.map((group) => (
                          <div
                            key={group.title}
                            className="rounded-2xl bg-background/70 p-5"
                          >
                            <h3 className="text-base font-semibold text-foreground">
                              {group.title}
                            </h3>
                            <ul className="mt-4 space-y-3">
                              {group.items.map((item) => (
                                <li
                                  key={item}
                                  className="flex gap-3 text-sm leading-7 text-muted-foreground"
                                >
                                  <span className="mt-2 h-2 w-2 flex-none rounded-full bg-primary" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </article>

            <aside className="space-y-6 xl:sticky xl:top-24 self-start">
              {project.status ? (
                <Card className="border-0 bg-gradient-card shadow-card">
                  <CardHeader>
                    <p className="text-sm font-medium text-muted-foreground">
                      Status
                    </p>
                    <CardTitle>Project Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-2xl bg-background/70 p-4 text-sm leading-7 text-muted-foreground">
                      {project.status}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              <Card className="border-0 bg-gradient-card shadow-card">
                <CardHeader>
                  <p className="text-sm font-medium text-muted-foreground">
                    Technology
                  </p>
                  <CardTitle>Tech Stack</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {project.technologies.map((technology) => (
                    <Badge
                      key={technology}
                      variant="outline"
                      className="border-border/70 bg-background/70 px-3 py-1.5 text-sm text-muted-foreground"
                    >
                      {technology}
                    </Badge>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-card shadow-card">
                <CardHeader>
                  <p className="text-sm font-medium text-muted-foreground">
                    Access
                  </p>
                  <CardTitle>Project Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {project.demo ? (
                    <Button variant="hero" className="w-full justify-between" asChild>
                      <a href={project.demo} target="_blank" rel="noopener noreferrer">
                        {project.demoLabel || "View project"}
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    </Button>
                  ) : null}

                  {project.website && project.website !== project.demo ? (
                    <Button
                      variant="secondary"
                      className="w-full justify-between"
                      asChild
                    >
                      <a
                        href={project.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {project.websiteLabel || "Visit website"}
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    </Button>
                  ) : null}

                  {project.github ? (
                    <Button
                      variant="download"
                      className="w-full justify-between"
                      asChild
                    >
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View source code
                        <Github className="h-4 w-4" />
                      </a>
                    </Button>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">
                      <div className="flex items-start gap-3">
                        <Lock className="mt-0.5 h-4 w-4 flex-none text-primary" />
                        <p>
                          Source repository is private for this project due to
                          enterprise or client confidentiality.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {relatedProjects.length > 0 ? (
                <Card className="border-0 bg-gradient-card shadow-card">
                  <CardHeader>
                    <p className="text-sm font-medium text-muted-foreground">
                      More Work
                    </p>
                    <CardTitle>Related Projects</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {relatedProjects.map((relatedProject) => (
                      <Link
                        key={relatedProject.slug}
                        href={getProjectUrl(relatedProject)}
                        className="group flex items-center justify-between rounded-2xl bg-background/70 px-4 py-4 transition-colors hover:bg-background"
                      >
                        <div>
                          <p className="font-medium text-foreground transition-colors group-hover:text-primary">
                            {relatedProject.titleShort || relatedProject.title}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {relatedProject.category}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              ) : null}
            </aside>
          </div>
        </section>
      </main>
    </ProjectsShell>
  );
}
