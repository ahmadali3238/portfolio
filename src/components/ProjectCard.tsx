import Link from "next/link";
import Image from "next/image";
import { Github, ExternalLink, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ProjectPreview } from "@/constants/data";
import { getProjectUrl } from "@/constants/data";
import { toast } from "sonner";

interface ProjectCardProps {
  readonly project: ProjectPreview;
}

function handlePrivateRepo() {
  toast.info("Private Repository", {
    description:
      "This repository is private due to enterprise or client confidentiality.",
  });
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const url = getProjectUrl(project);

  return (
    <Card className="group hover:shadow-elegant transition-all duration-300 bg-gradient-card border-0 overflow-hidden flex flex-col h-full">
      <div className="aspect-square w-full h-64 overflow-hidden bg-muted flex items-center justify-center relative">
        <Link
          href={url}
          className="block h-full w-full"
          aria-label={`Read the project details for ${project.title}`}
        >
          <Image
            src={project.image}
            alt={`Preview of ${project.title}`}
            width={400}
            height={256}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDBAMBAAAAAAAAAAAAAQIDAAQRBQYSITFBUWH/xAAVAQEBAAAAAAAAAAAAAAAAAAADBP/EABkRAAIDAQAAAAAAAAAAAAAAAAECABEhMf/aAAwDAQACEQMRAD8AzPR9v39xrVrFd6Y9vbNKoluDNGxRCcFgFYk4HfVX+UpStYAGANOzP//Z"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </Link>
      </div>

      <CardContent className="p-6 flex-1 flex flex-col">
        <h3 className="font-semibold text-lg mb-2 leading-tight group-hover:text-primary transition-colors duration-300">
          <Link href={url} className="hover:underline">
            {project.titleShort || project.title}
          </Link>
        </h3>

        <p className="text-sm text-muted-foreground mb-2">
          {project.duration}
        </p>

        <p className="text-xs font-medium uppercase tracking-wide text-primary/80 mb-3">
          {project.category}
        </p>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
          {project.description}
        </p>

        <div className="flex flex-wrap gap-3 mt-auto">
          <Button variant="secondary" size="sm" className="flex-1" asChild>
            <Link href={url}>Case Study</Link>
          </Button>
          {project.github ? (
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open the GitHub repository for ${project.title}`}
              >
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </a>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 opacity-70"
              onClick={handlePrivateRepo}
            >
              <Lock className="w-4 h-4 mr-2" />
              Private Repo
            </Button>
          )}

          {project.demo && (
            <Button variant="default" size="sm" className="flex-1" asChild>
              <a
                href={project.demo}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open the live project for ${project.title}`}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {project.demoLabel || "View Project"}
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
