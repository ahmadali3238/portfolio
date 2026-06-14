import type { MetadataRoute } from "next";
import { PROJECTS, SITE_URL, getProjectUrl } from "@/constants/data";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/projects`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...PROJECTS.map((project) => ({
      url: `${SITE_URL}${getProjectUrl(project)}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: project.featuredOnResume ? 0.7 : 0.6,
    })),
  ];
}
