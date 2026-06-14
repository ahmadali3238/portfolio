import SiteShell from "@/components/SiteShell";

interface ProjectsShellProps {
  children: React.ReactNode;
}

export default function ProjectsShell({ children }: ProjectsShellProps) {
  return <SiteShell>{children}</SiteShell>;
}
