// ============================================================
// UNIFIED DATA - Single Source of Truth for Portfolio & PDF
// ------------------------------------------------------------
// Re-skinned for Ahmad Ali — Asset Planning / Fixed Asset /
// Inventory Specialist (RFID Asset Tracking), Dubai, UAE.
//
// NOTE ON METRICS: All visible copy below uses only facts from
// Ahmad's CV. Where a quantified result (asset count, accuracy %,
// team size, time saved) would strengthen an engagement, a
// `// TO-CONFIRM:` comment marks where Ahmad should insert his
// real, verifiable number. Never publish an invented figure.
// ============================================================

import type { StaticImageData } from "next/image";
import {
  Linkedin,
  Mail,
  MessageCircle,
  Boxes,
  ScanLine,
  Briefcase,
  GraduationCap,
} from "lucide-react";

import { PROJECT_ENTRIES } from "./projects-data";

type SkillLevel = "Experienced" | "Intermediate";
// Internal category ids are kept stable (frontend/backend/databases/aiMl/
// mobile/tooling) because several modules key off them; only their titles
// and items are re-skinned to Ahmad's asset/inventory competencies.
type SkillCategoryId =
  | "frontend"
  | "backend"
  | "databases"
  | "aiMl"
  | "mobile"
  | "tooling";

interface Skill {
  name: string;
  level: SkillLevel;
  resumeLabel?: string;
}

export interface SkillCategory {
  id: SkillCategoryId;
  title: string;
  items: Skill[];
}

interface ExperienceEntry {
  title: string;
  company: string;
  companyShort?: string;
  location: string;
  duration: string;
  current: boolean;
  website: string;
  logo: StaticImageData | null;
  highlights: string[];
  featuredOnResume: boolean;
}

export interface Experience extends ExperienceEntry {
  description: string;
}

export interface ProjectCaseStudyGroup {
  title: string;
  items: string[];
}

export interface ProjectCaseStudySection {
  id: string;
  eyebrow: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  groups?: ProjectCaseStudyGroup[];
  diagram?: string;
}

export interface ProjectEntry {
  title: string;
  titleShort?: string;
  duration: string;
  image: string;
  description: string;
  resumeDescription: string;
  github: string | null;
  demo: string | null;
  demoLabel: string | null;
  website?: string | null;
  websiteLabel?: string | null;
  status?: string;
  featuredOnResume: boolean;
  category: string;
  technologies: string[];
  highlights: string[];
  caseStudySections: ProjectCaseStudySection[];
}

export interface Project extends ProjectEntry {
  slug: string;
  seoDescription: string;
  resumeHighlights: string[];
}

export type ProjectPreview = Pick<
  Project,
  | "title"
  | "titleShort"
  | "slug"
  | "duration"
  | "image"
  | "description"
  | "github"
  | "demo"
  | "demoLabel"
  | "featuredOnResume"
  | "category"
>;

export type CertificationCategory = "ai" | "software";

export interface Certification {
  title: string;
  issuer: string;
  duration: string;
  description: string;
  image: StaticImageData | null;
  category: CertificationCategory;
  featuredOnResume: boolean;
}

export interface ResumeSkillGroup {
  title: string;
  items: string[];
}

export interface Language {
  language: string;
  proficiency: string;
  assessment?: string;
}

const joinSentences = (sentences: string[]): string =>
  sentences
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .join(" ");

const stripProtocol = (value: string): string =>
  value.replace(/^https?:\/\//, "").replace(/\/$/, "");

const getFirstName = (value: string): string => value.split(" ")[0] || value;

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const formatLanguageEntry = (language: Language): string =>
  language.assessment
    ? `${language.language} (${language.proficiency}; ${language.assessment})`
    : `${language.language} (${language.proficiency})`;

const getUniqueSkillNames = (categories: SkillCategory[]): string[] => {
  const seen = new Set<string>();
  const names: string[] = [];

  categories.forEach((category) => {
    category.items.forEach((skill) => {
      const label = skill.resumeLabel || skill.name;
      if (!seen.has(label)) {
        seen.add(label);
        names.push(label);
      }
    });
  });

  return names;
};

const currentYear = new Date().getFullYear();
const documentType = "Resume";

const buildProjectSeoDescription = (project: ProjectEntry) =>
  `${project.title} — Ahmad Ali. ${project.resumeDescription}`;

const buildProjectResumeHighlights = (project: ProjectEntry): string[] => [
  project.resumeDescription,
  ...project.highlights.slice(0, 3),
  project.status
    ? `Current status: ${project.status}.`
    : `Tools & methods: ${project.technologies.slice(0, 5).join(", ")}.`,
];

// ============================================================
// DYNAMIC EXPERIENCE CALCULATION
// Years of experience are derived from a fixed career start so every place
// that mentions "X+ years" stays correct automatically as time passes.
// CAREER_START marks the beginning of Ahmad's inventory/operations career;
// SPECIALISM_START marks the start of his dedicated RFID / fixed-asset work.
// ============================================================
const MONTH_INDEX: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

const today = new Date();

const toAbsoluteMonth = (token: string): number => {
  const value = token.trim();
  if (/present|current|now/i.test(value)) {
    return today.getFullYear() * 12 + today.getMonth();
  }
  const [month, year] = value.split(/\s+/);
  return Number(year) * 12 + (MONTH_INDEX[month] ?? 0);
};

const monthsSince = (token: string): number =>
  toAbsoluteMonth("Present") - toAbsoluteMonth(token) + 1;

const formatYearsLabel = (months: number): string => {
  const years = Math.floor(months / 12);
  if (years >= 1) return `${years}+ ${years === 1 ? "Year" : "Years"}`;
  const safeMonths = Math.max(1, months);
  return `${safeMonths}+ ${safeMonths === 1 ? "Month" : "Months"}`;
};

const formatYearsPhrase = (months: number): string => {
  const years = Math.floor(months / 12);
  if (years >= 1) return `${years}+ ${years === 1 ? "year" : "years"}`;
  const safeMonths = Math.max(1, months);
  return `${safeMonths}+ ${safeMonths === 1 ? "month" : "months"}`;
};

const EXPERIENCE_ENTRIES: ExperienceEntry[] = [
  {
    title: "Asset Planning Specialist",
    company: "NEP Middle East & Asia",
    companyShort: "NEP Middle East",
    location: "Dubai, United Arab Emirates",
    duration: "Jan 2026 – Present",
    current: true,
    website: "https://nepgroup.com/",
    logo: null,
    highlights: [
      "Plan and track the equipment, assets, and resources behind live sports and entertainment productions, ensuring the right gear is allocated and available for each production.",
      "Coordinate with warehouse, operations, and logistics teams to schedule and allocate production assets.",
      "Maintain accuracy between physical inventory and system records through ongoing tracking and reconciliation of assets.",
      "Promoted internally from Warehouse Supervisor to Asset Planning Specialist based on demonstrated inventory accuracy and asset coordination performance.",
    ],
    featuredOnResume: true,
  },
  {
    title: "Warehouse Supervisor",
    company: "NEP Group, Inc.",
    companyShort: "NEP Group",
    location: "United Arab Emirates",
    duration: "Jan 2025 – Jan 2026",
    current: false,
    website: "https://nepgroup.com/",
    logo: null,
    highlights: [
      "Supervised daily warehouse operations and crew handling broadcast and live-production equipment.",
      "Managed shipping and receiving of equipment, including check-in/check-out, dispatch, and return workflows.",
      "Maintained inventory accuracy through ongoing asset tracking and reconciliation of physical stock against system records.",
      "Coordinated equipment preparation and availability to ensure gear readiness for scheduled productions.",
    ],
    featuredOnResume: true,
  },
  {
    title: "Field Supervisor / Fixed Asset Inventory Specialist",
    company: "Acube InfoTech LLC",
    companyShort: "Acube InfoTech",
    location: "Dubai, United Arab Emirates",
    duration: "Oct 2022 – Jan 2025",
    current: false,
    website: "https://www.acubeinfotech.com/",
    logo: null,
    highlights: [
      "Managed and supervised the fixed-asset inventory and audit process for multiple client organizations, maintaining accurate records of company assets.",
      "Tagged assets with Radio Frequency Identification (RFID) tags to maintain accurate, traceable records of company assets.",
      "Led a team of technicians in scanning and updating asset information using advanced inventory software.",
      "Coordinated on-site field work with remote teams to keep client fixed-asset registers current and reconciled.",
    ],
    featuredOnResume: true,
  },
  {
    title: "Sales Assistant",
    company: "Toyota Center",
    companyShort: "Toyota Center",
    location: "Pakistan",
    duration: "Jul 2019 – Sep 2022",
    current: false,
    website: "",
    logo: null,
    highlights: [
      "Stocked and restocked merchandise, maintaining inventory accuracy and ensuring product availability on the showroom floor.",
      "Delivered 25 cars to customers over a five-month period while consistently meeting sales targets.",
      "Provided personalized customer service, helping clients select the right vehicle for their needs.",
    ],
    featuredOnResume: true,
  },
  {
    title: "Front Desk Manager",
    company: "Chieftain Hotel",
    companyShort: "Chieftain Hotel",
    location: "Pakistan",
    duration: "Apr 2018 – Jun 2019",
    current: false,
    website: "",
    logo: null,
    highlights: [
      "Supervised day-to-day front-desk and reception operations.",
      "Trained and managed staff to deliver consistent, high-quality service.",
      "Addressed customer complaints and queries, resolving issues promptly.",
    ],
    featuredOnResume: false,
  },
];

// Start of Ahmad's inventory/operations career (drives the headline "7+ years").
const CAREER_START = "Jul 2019";
// Start of dedicated RFID / fixed-asset specialism (Acube InfoTech).
const SPECIALISM_START = "Oct 2022";

const TOTAL_EXPERIENCE_MONTHS = monthsSince(CAREER_START);
const TOTAL_EXPERIENCE_LABEL = formatYearsLabel(TOTAL_EXPERIENCE_MONTHS);
const TOTAL_EXPERIENCE_PHRASE = formatYearsPhrase(TOTAL_EXPERIENCE_MONTHS);
const SPECIALISM_LABEL = formatYearsLabel(monthsSince(SPECIALISM_START));

export const PORTFOLIO_CONTENT = {
  personal: {
    name: "Ahmad Ali",
    title: "Asset Planning, Fixed Asset & Inventory Specialist | RFID Asset Tracking",
    location: "United Arab Emirates",
    city: "Dubai",
    email: "ahmadalibusiness3238@gmail.com",
    phone: "+971 56 5756141",
    // App needs a server runtime (AI chat, job finder, /for pages), so this
    // points at a Vercel-style URL rather than the GitHub Pages CV link.
    portfolio: "https://ahmadali3238.vercel.app",
    linkedin: "https://www.linkedin.com/in/ahmadali3238",
    whatsapp: "https://wa.me/971565756141",
    github: "",
    youtube: "",
    facebook: "",
    instagram: "",
    upwork: "",
  },
  profile: {
    greeting: "Hello, I'm",
    professionalSummary: `Asset Planning and Fixed-Asset / Inventory Specialist with ${TOTAL_EXPERIENCE_PHRASE} across asset tracking, fixed-asset inventory and audit, RFID asset tagging, and warehouse operations. Currently planning the equipment and resources behind live sports and entertainment productions at NEP Middle East & Asia in Dubai. Promoted internally from Warehouse Supervisor to Asset Planning Specialist after consistently maintaining accuracy between physical inventory and system records. Brings strong inventory control, cycle counting, team supervision, and cross-functional logistics coordination focused on inventory accuracy and asset availability.`,
    experienceBadge: {
      label: TOTAL_EXPERIENCE_LABEL,
      sublabel: "Experience",
    },
    focusBadge: {
      label: "RFID Asset",
      sublabel: "Tracking",
    },
    experienceSnapshot: [
      { label: "Asset & Inventory Operations", value: TOTAL_EXPERIENCE_LABEL },
      { label: "RFID & Fixed-Asset Tagging", value: SPECIALISM_LABEL },
    ],
  },
  summaries: {
    seo:
      "Ahmad Ali is an Asset Planning and Fixed-Asset / Inventory Specialist in Dubai, UAE, with 7+ years in RFID asset tracking, fixed-asset inventory and audit, cycle counting, reconciliation, and warehouse operations.",
  },
  education: {
    degree: "Diploma of Associate Engineering (DAE) — Civil",
    degreeShort: "DAE Civil",
    university: "Science Institute of Technology (SIT)",
    location: "Pakistan",
    duration: "2017 – 2019",
    startDate: "01/2017",
    endDate: "11/2019",
    cgpa: "",
  },
  experiences: EXPERIENCE_ENTRIES,
  projects: PROJECT_ENTRIES,
  certifications: [
    {
      title: "Microsoft Office (Computer Course)",
      issuer: "TEVTA, Pakistan",
      duration: "Nov 2019 – Apr 2020",
      description:
        "Government-recognized computer course covering Microsoft Office — Word, Excel, and PowerPoint — for data entry, reporting, and inventory record-keeping.",
      image: null,
      category: "software",
      featuredOnResume: true,
    },
    {
      title: "Quantity Surveyor (Course)",
      issuer: "Science Institute of Technology (SIT)",
      duration: "Dec 2018 – Oct 2019",
      description:
        "Vocational course in quantity surveying — measurement, estimation, and materials quantification — complementing on-site asset and materials control.",
      image: null,
      category: "software",
      featuredOnResume: true,
    },
  ] as Certification[],
  skillCategories: [
    {
      id: "frontend",
      title: "Fixed Asset Management",
      items: [
        { name: "Fixed Asset Management", level: "Experienced" },
        { name: "Fixed Asset Register", level: "Experienced" },
        { name: "Asset Tagging / Serialized Assets", level: "Experienced" },
        { name: "Asset Lifecycle Management", level: "Experienced" },
        { name: "Asset Reconciliation", level: "Experienced" },
        { name: "Capitalization & Depreciation Records", level: "Intermediate" },
      ],
    },
    {
      id: "backend",
      title: "Inventory & Stock Control",
      items: [
        { name: "Inventory Management", level: "Experienced" },
        { name: "Inventory Control", level: "Experienced" },
        { name: "Cycle Counting", level: "Experienced" },
        { name: "Physical Inventory Count", level: "Experienced" },
        { name: "Inventory Reconciliation", level: "Experienced" },
        { name: "Stock Management", level: "Experienced" },
        { name: "FIFO / FEFO", level: "Experienced" },
        { name: "ABC Analysis", level: "Intermediate" },
      ],
    },
    {
      id: "databases",
      title: "RFID & Asset Tracking",
      items: [
        { name: "RFID Tagging", level: "Experienced", resumeLabel: "RFID Asset Tagging" },
        { name: "Barcode Scanning", level: "Experienced" },
        { name: "Asset Tracking", level: "Experienced" },
        { name: "Asset Labeling & Serialization", level: "Experienced" },
        { name: "Check-in / Check-out", level: "Experienced" },
        { name: "Chain-of-Custody Workflows", level: "Experienced" },
      ],
    },
    {
      id: "aiMl",
      title: "Audit, Reconciliation & Reporting",
      items: [
        { name: "Fixed Asset Audit", level: "Experienced" },
        { name: "Inventory Audit", level: "Experienced" },
        { name: "Physical Asset Verification", level: "Experienced" },
        { name: "Reconciliation (Physical vs System)", level: "Experienced" },
        { name: "Discrepancy & Ghost-Asset Resolution", level: "Experienced" },
        { name: "Data Entry & Analysis", level: "Experienced" },
        { name: "Reporting & Analytics", level: "Experienced" },
      ],
    },
    {
      id: "mobile",
      title: "Warehouse & Logistics",
      items: [
        { name: "Warehouse Operations", level: "Experienced" },
        { name: "Shipping & Receiving", level: "Experienced" },
        { name: "Logistics Coordination", level: "Experienced" },
        { name: "Supply Chain Coordination", level: "Experienced" },
        { name: "Resource Scheduling / Equipment Allocation", level: "Experienced" },
        { name: "Equipment Rental & Rental-Pool Management", level: "Experienced" },
        { name: "Dispatch & Returns", level: "Experienced" },
      ],
    },
    {
      id: "tooling",
      title: "Systems, Tools & Leadership",
      items: [
        { name: "Inventory & Asset-Management Software", level: "Experienced" },
        { name: "Barcode / RFID Scanning Systems", level: "Experienced" },
        { name: "Microsoft Excel (Advanced)", level: "Experienced", resumeLabel: "Microsoft Excel" },
        { name: "Microsoft Office (Word, Excel, PowerPoint)", level: "Experienced", resumeLabel: "Microsoft Office" },
        { name: "Team & Site Supervision", level: "Experienced" },
        { name: "Client Communication", level: "Experienced" },
        { name: "Problem Solving", level: "Experienced" },
        { name: "Time Management", level: "Experienced" },
      ],
    },
  ] as SkillCategory[],
  languages: [
    { language: "Urdu", proficiency: "Native or Bilingual Proficiency" },
    { language: "English", proficiency: "Full Professional Proficiency" },
    { language: "Hindi", proficiency: "Full Professional Proficiency" },
  ] as Language[],
  engagement: {
    availabilityMessage:
      "Open to asset-management, fixed-asset, inventory-control, and warehouse roles across Dubai and the wider UAE. Send a message to discuss how I can keep your asset registers accurate and audit-ready.",
    hireMe: {
      title: "Available for Hire",
      description:
        "Open to asset-management, fixed-asset, inventory-control, and warehouse-supervision roles across Dubai and the wider UAE.",
      ctaTitle: "Let's Work Together",
      ctaDescription:
        "I'm on a one-month notice period with a transferable employment visa. If you're hiring for asset, inventory, or warehouse operations, I'd welcome a conversation.",
      buttonLabel: "Get in Touch",
      features: [
        {
          title: "Audit-Ready Registers",
          description:
            "Fixed-asset registers reconciled against system records and kept inspection-ready.",
        },
        {
          title: "RFID & Barcode Tagging",
          description:
            "Hands-on RFID and barcode asset tagging, serialization, and chain-of-custody tracking.",
        },
        {
          title: "Inventory Accuracy",
          description:
            "Cycle counting, physical verification, and reconciliation that keep stock and asset data accurate.",
        },
        {
          title: "Team & Site Supervision",
          description:
            "Experience leading tagging technicians and warehouse crews across multiple client sites.",
        },
      ],
    },
    services: [
      "Fixed-asset register management & reconciliation",
      "RFID & barcode asset tagging and tracking",
      "Inventory control, cycle counting & physical verification",
      "Fixed-asset and inventory audits",
      "Warehouse operations & shipping/receiving",
      "Equipment scheduling & resource allocation for productions",
    ],
    workStyle: [
      "Accuracy-first: physical counts reconciled to system records",
      "Clear documentation and audit-ready trails",
      "Calm and organized under live-production and deadline pressure",
      "Reliable team supervision and cross-team coordination",
    ],
    timelineEstimates: [
      { label: "Notice period", value: "1 month" },
      { label: "Visa status", value: "Employment visa (transferable)" },
      { label: "Based in", value: "Dubai, UAE" },
    ],
    idealClients: [
      "Logistics, 3PL & warehousing operations",
      "Oil & gas, utilities & facilities management",
      "Healthcare and government asset-tracking programs",
      "Retail, FMCG, broadcast & live-events asset management",
    ],
    pricingNote:
      "I'm open to discussing compensation in line with UAE market rates for an experienced asset and inventory specialist. The best next step is a quick call or message to talk through the role.",
  },
};

// ============ PERSONAL INFO ============
export const PERSONAL_INFO = PORTFOLIO_CONTENT.personal;
export const FIRST_NAME = getFirstName(PERSONAL_INFO.name);
export const LOCATION_LABEL = `${PERSONAL_INFO.city}, ${PERSONAL_INFO.location}`;
export const PORTFOLIO_LABEL = stripProtocol(PERSONAL_INFO.portfolio);
export const LINKEDIN_LABEL = stripProtocol(PERSONAL_INFO.linkedin);
export const GITHUB_LABEL = PERSONAL_INFO.github
  ? stripProtocol(PERSONAL_INFO.github)
  : "";

// ============ SUMMARY / ABOUT ============
export const PROFESSIONAL_SUMMARY = PORTFOLIO_CONTENT.profile.professionalSummary;
export const SUMMARY = PROFESSIONAL_SUMMARY;
export const SUMMARY_SHORT = PROFESSIONAL_SUMMARY;

// ============ EDUCATION ============
export const EDUCATION = PORTFOLIO_CONTENT.education;

// ============ EXPERIENCE ============
export const EXPERIENCES: Experience[] = PORTFOLIO_CONTENT.experiences.map(
  (experience) => ({
    ...experience,
    description: joinSentences(experience.highlights),
  })
);
export const RESUME_EXPERIENCES = EXPERIENCES.filter(
  (experience) => experience.featuredOnResume
);

// ============ PROJECTS / ENGAGEMENTS ============
export const PROJECTS: Project[] = PORTFOLIO_CONTENT.projects.map((project) => {
  const slug = slugify(project.titleShort || project.title);

  return {
    ...project,
    slug,
    seoDescription: buildProjectSeoDescription(project),
    resumeHighlights: buildProjectResumeHighlights(project),
  };
});
export const RESUME_PROJECTS = PROJECTS.filter(
  (project) => project.featuredOnResume
);
export const PROJECTS_PREVIEW: ProjectPreview[] = PROJECTS.map(
  ({
    title,
    titleShort,
    slug,
    duration,
    image,
    description,
    github,
    demo,
    demoLabel,
    featuredOnResume,
    category,
  }) => ({
    title,
    titleShort,
    slug,
    duration,
    image,
    description,
    github,
    demo,
    demoLabel,
    featuredOnResume,
    category,
  })
);
export const getProjectUrl = (project: Pick<Project, "slug">) =>
  `/projects/${project.slug}`;
export const getProjectBySlug = (slug: string) =>
  PROJECTS.find((project) => project.slug === slug);

// ============ CERTIFICATIONS ============
export const CERTIFICATIONS = PORTFOLIO_CONTENT.certifications;
export const RESUME_CERTIFICATIONS = CERTIFICATIONS;

// Certification categories (drives the certifications toggle UI). Ahmad's
// credentials are all training/courses, so a single category is used.
export const CERTIFICATION_CATEGORIES: {
  id: CertificationCategory;
  label: string;
}[] = [{ id: "software", label: "Certifications & Training" }];

// ============ SKILLS ============
export const SKILL_CATEGORIES = PORTFOLIO_CONTENT.skillCategories;
export const SKILLS = getUniqueSkillNames(SKILL_CATEGORIES);
export const RESUME_SKILL_GROUPS: ResumeSkillGroup[] = [
  { id: "frontend", maxItems: 6 },
  { id: "backend", maxItems: 8 },
  { id: "databases", maxItems: 6 },
  { id: "aiMl", maxItems: 7 },
  { id: "mobile", maxItems: 7 },
  { id: "tooling", maxItems: 8 },
]
  .map(({ id, maxItems }) => {
    const category = SKILL_CATEGORIES.find((item) => item.id === id);

    return {
      title: category?.title || "",
      items:
        category?.items
          .map((skill) => skill.resumeLabel || skill.name)
          .slice(0, maxItems) || [],
    };
  })
  .filter((group) => group.title && group.items.length > 0);

export const SKILLS_CATEGORIZED = {
  frontend:
    SKILL_CATEGORIES.find((category) => category.id === "frontend")?.items.map(
      (skill) => skill.resumeLabel || skill.name
    ) || [],
  backend:
    SKILL_CATEGORIES.find((category) => category.id === "backend")?.items.map(
      (skill) => skill.resumeLabel || skill.name
    ) || [],
  databases:
    SKILL_CATEGORIES.find((category) => category.id === "databases")?.items.map(
      (skill) => skill.resumeLabel || skill.name
    ) || [],
  aiMl:
    SKILL_CATEGORIES.find((category) => category.id === "aiMl")?.items.map(
      (skill) => skill.resumeLabel || skill.name
    ) || [],
  mobile:
    SKILL_CATEGORIES.find((category) => category.id === "mobile")?.items.map(
      (skill) => skill.resumeLabel || skill.name
    ) || [],
  tooling:
    SKILL_CATEGORIES.find((category) => category.id === "tooling")?.items.map(
      (skill) => skill.resumeLabel || skill.name
    ) || [],
};

// ============ LANGUAGES ============
export const LANGUAGES = PORTFOLIO_CONTENT.languages;
export const PRIMARY_CONTACT_CHANNELS = [
  {
    label: "Email",
    value: PERSONAL_INFO.email,
    href: `mailto:${PERSONAL_INFO.email}`,
  },
  {
    label: "Phone",
    value: PERSONAL_INFO.phone,
    href: `tel:${PERSONAL_INFO.phone.replace(/\s+/g, "")}`,
  },
  {
    label: "Location",
    value: LOCATION_LABEL,
    href: `https://maps.google.com/?q=${encodeURIComponent(LOCATION_LABEL)}`,
  },
];
export const PRIMARY_SOCIAL_LINKS = [
  {
    label: "LinkedIn",
    href: PERSONAL_INFO.linkedin,
  },
];

// ============ META INFO ============
export const META = {
  resumeVersion: "v1.0",
  documentType,
  resumeFileName: `Ahmad-Ali-${documentType}-${currentYear}.pdf`,
  greeting: PORTFOLIO_CONTENT.profile.greeting,
  profileImage: "/ahmad-ali-hero.png",
  aboutImage: "/about-pic.png",
  siteDescription: PORTFOLIO_CONTENT.summaries.seo,
};

export const SITE_URL = PERSONAL_INFO.portfolio;
export const SITE_NAME = `${PERSONAL_INFO.name} Portfolio`;
export const SEO_TITLE = `${PERSONAL_INFO.name} | ${PERSONAL_INFO.title}`;
export const DEFAULT_OG_IMAGE = META.aboutImage;
export const SOCIAL_PROFILE_URLS = [PERSONAL_INFO.linkedin].filter(Boolean);
export const SEO_KEYWORDS = [
  PERSONAL_INFO.name,
  PERSONAL_INFO.title,
  "Fixed Asset Specialist Dubai",
  "Inventory Controller UAE",
  "Asset Management Specialist",
  "RFID Asset Tracking",
  "Fixed Asset Register",
  "Inventory Control",
  "Cycle Counting",
  "Warehouse Supervisor Dubai",
  "Stock Controller",
  "Asset Reconciliation",
  "Fixed Asset Audit",
  "Asset Planning Specialist",
  "Inventory Management UAE",
  LOCATION_LABEL,
];

// ============ HERO SECTION EXPORTS ============
export const HERO_PROFILE_IMAGE = META.profileImage;

export const HERO_SOCIAL_LINKS = [
  { icon: Linkedin, url: PERSONAL_INFO.linkedin, label: "LinkedIn" },
  { icon: Mail, url: `mailto:${PERSONAL_INFO.email}`, label: "Email" },
  { icon: MessageCircle, url: PERSONAL_INFO.whatsapp, label: "WhatsApp" },
];

// Runtime PDF generation is the active resume source of truth.
export const HERO_RESUME_PATH = `/assets/${META.resumeFileName}`;
export const HERO_NAME = PERSONAL_INFO.name;
export const HERO_TITLE = PERSONAL_INFO.title;
export const HERO_GREETING = META.greeting;

// ============ ABOUT SECTION EXPORTS ============
export const ABOUT_PROFILE_IMAGE = META.aboutImage;

export const ABOUT_FLOATING_STATS = [
  {
    icon: Boxes,
    label: PORTFOLIO_CONTENT.profile.experienceBadge.label,
    sublabel: PORTFOLIO_CONTENT.profile.experienceBadge.sublabel,
    className:
      "absolute -top-6 -right-6 bg-gradient-primary rounded-xl p-4 shadow-glow",
    iconClass: "w-6 h-6 text-primary-foreground mx-auto mb-1",
    labelClass: "text-xs text-primary-foreground font-semibold",
    sublabelClass: "text-xs text-primary-foreground/80",
    animate: { y: [0, -15, 0] },
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
  {
    icon: ScanLine,
    label: PORTFOLIO_CONTENT.profile.focusBadge.label,
    sublabel: PORTFOLIO_CONTENT.profile.focusBadge.sublabel,
    className:
      "absolute -bottom-6 -left-6 bg-gradient-hero rounded-xl p-4 shadow-elegant",
    iconClass: "w-6 h-6 text-hero-foreground mx-auto mb-1",
    labelClass: "text-xs text-hero-foreground font-semibold",
    sublabelClass: "text-xs text-hero-foreground/80",
    animate: { y: [0, 15, 0] },
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
      delay: 1.5,
    },
  },
];

export const ABOUT_CARDS = [
  {
    icon: Briefcase,
    title: "Experience",
    details: PORTFOLIO_CONTENT.profile.experienceSnapshot,
  },
  {
    icon: GraduationCap,
    title: "Education",
    details: [
      { label: EDUCATION.degree, value: `(${EDUCATION.degreeShort})` },
      { label: EDUCATION.university, value: EDUCATION.duration },
    ],
  },
];

export const ABOUT_DESCRIPTION = SUMMARY;

// ============ ENHANCED EXPORTS FOR COMPONENTS ============
export const EXPERIENCES_WITH_LOGOS = EXPERIENCES;

export const CERTIFICATE_IMAGES = CERTIFICATIONS.filter(
  (certification) => certification.image
).map((certification) => ({
  image: certification.image!,
  title: certification.title,
  description: certification.description,
  category: certification.category,
}));

export const CERTIFICATES_DISPLAY = CERTIFICATIONS.map((certification) => ({
  title: certification.title,
  duration: certification.duration,
  description: certification.description,
  issuer: certification.issuer,
  category: certification.category,
}));
