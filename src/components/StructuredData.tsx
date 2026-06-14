import {
  CERTIFICATIONS,
  EDUCATION,
  EXPERIENCES,
  LANGUAGES,
  PERSONAL_INFO,
  PORTFOLIO_CONTENT,
  PROFESSIONAL_SUMMARY,
  PROJECTS,
  SITE_NAME,
  SITE_URL,
  SOCIAL_PROFILE_URLS,
  SKILLS,
  DEFAULT_OG_IMAGE,
  SEO_TITLE,
  getProjectUrl,
} from "@/constants/data";

const currentEmployer = EXPERIENCES.find((experience) => experience.current);

const featuredProjects = PROJECTS.filter(
  (project) => project.featuredOnResume
);

export default function StructuredData() {
  const siteId = `${SITE_URL}#website`;
  const pageId = `${SITE_URL}#webpage`;
  const personId = `${SITE_URL}#person`;
  const profileImage = new URL(DEFAULT_OG_IMAGE, SITE_URL).toString();

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": siteId,
        url: SITE_URL,
        name: SITE_NAME,
        description: PROFESSIONAL_SUMMARY,
        inLanguage: "en",
      },
      {
        "@type": "ProfilePage",
        "@id": pageId,
        url: SITE_URL,
        name: SEO_TITLE,
        description: PROFESSIONAL_SUMMARY,
        isPartOf: {
          "@id": siteId,
        },
        about: {
          "@id": personId,
        },
        mainEntity: {
          "@id": personId,
        },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: profileImage,
        },
      },
      {
        "@type": "Person",
        "@id": personId,
        name: PERSONAL_INFO.name,
        url: SITE_URL,
        image: profileImage,
        email: PERSONAL_INFO.email,
        telephone: PERSONAL_INFO.phone,
        jobTitle: PERSONAL_INFO.title,
        description: PROFESSIONAL_SUMMARY,
        address: {
          "@type": "PostalAddress",
          addressLocality: PERSONAL_INFO.city,
          addressCountry: PERSONAL_INFO.location,
        },
        sameAs: SOCIAL_PROFILE_URLS,
        alumniOf: {
          "@type": "CollegeOrUniversity",
          name: EDUCATION.university,
        },
        worksFor: currentEmployer
          ? {
              "@type": "Organization",
              name: currentEmployer.company,
              url: currentEmployer.website,
            }
          : undefined,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "professional inquiries",
          email: PERSONAL_INFO.email,
          telephone: PERSONAL_INFO.phone,
          availableLanguage: LANGUAGES.map((language) => language.language),
          areaServed: "Worldwide",
        },
        knowsAbout: [
          ...PORTFOLIO_CONTENT.engagement.services,
          ...SKILLS.slice(0, 16),
        ],
        knowsLanguage: LANGUAGES.map((language) => language.language),
        award: CERTIFICATIONS.map((certification) => certification.title),
      },
      {
        "@type": "ItemList",
        "@id": `${SITE_URL}#featured-engagements`,
        name: "Key engagements",
        itemListOrder: "https://schema.org/ItemListOrderAscending",
        numberOfItems: featuredProjects.length,
        itemListElement: featuredProjects.map((project, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "CreativeWork",
            name: project.title,
            description: project.resumeDescription,
            url: `${SITE_URL}${getProjectUrl(project)}`,
          },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
      }}
    />
  );
}
