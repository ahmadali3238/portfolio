// ============================================================
// ENGAGEMENTS DATA — single source of truth for "Key Engagements"
// ------------------------------------------------------------
// Each engagement shown on the site is a ProjectEntry in this array. It is
// imported by src/constants/data.ts (PORTFOLIO_CONTENT.projects) and rendered
// as cards on the home page + detail pages at /projects/[slug].
//
// METRICS: Every entry uses only facts from Ahmad's CV. Where a real number
// (asset count, register accuracy %, team size, time saved) would make an
// engagement far more persuasive, a `// TO-CONFIRM:` comment marks exactly
// where Ahmad should drop in his own verifiable figure. Do not invent numbers.
//
// IMAGES: Cover images currently point at neutral placeholders. Replace them
// with real (anonymized) photos — tagged assets, count sheets, dashboards,
// warehouse shots — for a big credibility lift. Drop files in /public and
// update the `image` path.
// ============================================================
import type { ProjectEntry } from "./data";

export const PROJECT_ENTRIES: ProjectEntry[] = [
  // ---------------------------------------------------------- RFID Fixed-Asset Tagging
  {
    title: "RFID Fixed-Asset Tagging & Audit — Multi-Client Rollout",
    titleShort: "RFID Fixed-Asset Tagging",
    duration: "Oct 2022 – Jan 2025",
    image: "/engagements/rfid.png",
    description:
      "Led a team of technicians delivering RFID fixed-asset tagging, scanning, and audit for multiple client organizations, keeping their asset registers accurate, traceable, and reconciled.",
    resumeDescription:
      "Led RFID fixed-asset tagging and audit across multiple client sites, maintaining accurate, reconciled fixed-asset registers using advanced inventory software.",
    github: null,
    demo: null,
    demoLabel: null,
    website: null,
    websiteLabel: null,
    // TO-CONFIRM: e.g. status: "Tagged 20,000+ assets across 8 client sites"
    featuredOnResume: true,
    category: "RFID Asset Tracking",
    technologies: [
      "RFID Tagging",
      "Barcode Scanning",
      "Asset-Management Software",
      "Fixed Asset Register",
      "Physical Verification",
      "Reconciliation",
      "Team Supervision",
    ],
    highlights: [
      "Managed and supervised the fixed-asset inventory and audit process for multiple client organizations, maintaining accurate records of company assets.",
      "Tagged assets with Radio Frequency Identification (RFID) tags to keep records accurate and traceable.",
      "Led a team of technicians scanning and updating asset information in advanced inventory software, coordinating on-site field work with remote teams.",
    ],
    caseStudySections: [
      {
        id: "overview",
        eyebrow: "Overview",
        title: "Turning incomplete asset registers into audit-ready records",
        paragraphs: [
          "As Field Supervisor / Fixed Asset Inventory Specialist at Acube InfoTech, Ahmad ran the fixed-asset tagging and audit process for multiple client organizations — each needing a complete, accurate, and reconciled fixed-asset register.",
          "The work combined on-site RFID and barcode tagging, systematic scanning into inventory software, and reconciliation of the physical count against each client's system records — all delivered by a field team Ahmad led and coordinated with remote back-office teams.",
        ],
      },
      {
        id: "approach",
        eyebrow: "What I did",
        title: "A repeatable, supervised tagging and audit process",
        bullets: [
          "Planned and supervised each client engagement end to end, from site survey to final reconciled register.",
          "Applied RFID and barcode tags with consistent labeling and serialization for accurate, traceable assets.",
          "Captured and updated asset data in advanced inventory software, then reconciled it against finance/system records.",
          "Led a team of technicians and coordinated on-site field work with remote teams to keep registers current.",
        ],
      },
      {
        id: "outcome",
        eyebrow: "Outcome",
        title: "Accurate, traceable, reconciled fixed-asset registers",
        paragraphs: [
          // TO-CONFIRM: insert real numbers — total assets tagged, number of
          // client sites, register accuracy reached (e.g. 98%+), and the
          // reduction in physical-count time achieved with RFID vs manual.
          "Clients ended each engagement with a complete, RFID-tagged fixed-asset register that reconciled to their system of record — ready for audit and ongoing tracking.",
        ],
      },
    ],
  },
  // ---------------------------------------------------------- NEP Asset Planning
  {
    title: "Broadcast & Live-Production Asset Planning",
    titleShort: "Broadcast Asset Planning",
    duration: "Jan 2026 – Present",
    image: "/engagements/broadcast.png",
    description:
      "Plan and track the equipment, assets, and resources behind live sports and entertainment productions, making sure the right gear is allocated and available for every production.",
    resumeDescription:
      "Plan and allocate equipment and assets for live sports and entertainment productions at NEP Middle East, maintaining physical-vs-system inventory accuracy.",
    github: null,
    demo: null,
    demoLabel: null,
    website: null,
    websiteLabel: null,
    status: "Ongoing",
    featuredOnResume: true,
    category: "Asset Planning",
    technologies: [
      "Asset Planning",
      "Resource Scheduling",
      "Equipment Allocation",
      "Inventory Reconciliation",
      "Logistics Coordination",
    ],
    highlights: [
      "Plan and track equipment, assets, and resources for live sports and entertainment productions, ensuring the right gear is allocated and available for each production.",
      "Coordinate with warehouse, operations, and logistics teams to schedule and allocate production assets.",
      "Maintain accuracy between physical inventory and system records through ongoing tracking and reconciliation.",
    ],
    caseStudySections: [
      {
        id: "overview",
        eyebrow: "Overview",
        title: "High-value assets, live deadlines, zero room for error",
        paragraphs: [
          "At NEP Middle East & Asia, Ahmad plans the equipment and resources behind live sports and entertainment productions — a fast-moving, high-value asset base that has to be in the right place, ready, for every production.",
          "The role blends asset planning with cross-functional coordination: scheduling and allocating gear with warehouse, operations, and logistics teams while keeping the physical inventory perfectly in step with system records.",
        ],
      },
      {
        id: "approach",
        eyebrow: "What I do",
        title: "Plan, allocate, reconcile — production after production",
        bullets: [
          "Plan and track equipment and assets so each production has exactly the gear it needs, when it needs it.",
          "Coordinate scheduling and allocation across warehouse, operations, and logistics teams.",
          "Run ongoing tracking and reconciliation to keep physical inventory and system records aligned.",
        ],
      },
    ],
  },
  // ---------------------------------------------------------- Warehouse Supervision → Promotion
  {
    title: "Warehouse Supervision & Internal Promotion to Asset Planning",
    titleShort: "Warehouse Turnaround & Promotion",
    duration: "Jan 2025 – Jan 2026",
    image: "/engagements/warehouse.png",
    description:
      "Supervised warehouse operations and crew handling broadcast and live-production equipment, and delivered the inventory-control and supervisory performance that earned an internal promotion to Asset Planning Specialist.",
    resumeDescription:
      "Supervised broadcast-equipment warehouse operations and shipping/receiving, maintaining inventory accuracy and earning promotion to Asset Planning Specialist.",
    github: null,
    demo: null,
    demoLabel: null,
    website: null,
    websiteLabel: null,
    featuredOnResume: true,
    category: "Warehouse Operations",
    technologies: [
      "Warehouse Operations",
      "Shipping & Receiving",
      "Check-in / Check-out",
      "Inventory Reconciliation",
      "Crew Supervision",
    ],
    highlights: [
      "Supervised daily warehouse operations and crew handling broadcast and live-production equipment.",
      "Managed shipping and receiving including check-in/check-out, dispatch, and return workflows.",
      "Maintained inventory accuracy through ongoing asset tracking and reconciliation, and prepared gear to ensure readiness for scheduled productions.",
    ],
    caseStudySections: [
      {
        id: "overview",
        eyebrow: "Overview",
        title: "Earning the next role through accuracy and reliability",
        paragraphs: [
          "As Warehouse Supervisor at NEP, Ahmad ran daily operations for a warehouse of high-value broadcast and live-production equipment, owning the shipping/receiving, check-in/check-out, dispatch, and return workflows.",
          "By keeping inventory accurate and gear consistently production-ready, he demonstrated the inventory-control and supervisory performance that led to an internal promotion into the Asset Planning Specialist role.",
        ],
      },
      {
        id: "approach",
        eyebrow: "What I did",
        title: "Tight control of fast-moving, high-value equipment",
        bullets: [
          "Supervised the daily warehouse crew and operations handling broadcast equipment.",
          "Ran shipping/receiving and check-in/check-out, dispatch, and return workflows with disciplined tracking.",
          "Reconciled physical stock against system records and prepared equipment for scheduled productions.",
          // TO-CONFIRM: add a metric for the promotion story — e.g. stock/dispatch
          // accuracy %, time-to-promotion, or the value of the asset portfolio taken on.
        ],
      },
    ],
  },
  // ---------------------------------------------------------- 25-Vehicle Delivery Program
  {
    title: "25-Vehicle Delivery Program",
    titleShort: "25-Vehicle Delivery Program",
    duration: "2019 – 2022",
    image: "/engagements/vehicle.png",
    description:
      "Planned and executed the delivery of 25 vehicles to customers over a five-month period while consistently meeting sales targets and maintaining showroom inventory accuracy.",
    resumeDescription:
      "Delivered 25 vehicles to customers within five months while meeting sales targets and maintaining showroom inventory accuracy.",
    github: null,
    demo: null,
    demoLabel: null,
    website: null,
    websiteLabel: null,
    featuredOnResume: false,
    category: "Logistics & Delivery",
    technologies: [
      "Inventory Accuracy",
      "Stock Replenishment",
      "Scheduling",
      "Customer Service",
    ],
    highlights: [
      "Delivered 25 cars to customers over a five-month period while consistently meeting sales targets.",
      "Stocked and restocked merchandise, maintaining inventory accuracy and product availability on the showroom floor.",
      "Provided personalized customer service, helping clients select the right vehicle for their needs.",
    ],
    caseStudySections: [
      {
        id: "overview",
        eyebrow: "Overview",
        title: "Delivery, scheduling, and inventory under sales targets",
        paragraphs: [
          "At Toyota Center, Ahmad combined showroom inventory accuracy with delivery execution — planning and handing over 25 vehicles to customers across a five-month stretch while consistently hitting sales targets.",
          "The role built early discipline in stock accuracy, replenishment, and coordinating multiple moving pieces to a deadline — foundations he later carried into fixed-asset and inventory work.",
        ],
      },
    ],
  },
];
