import {
  CERTIFICATIONS,
  EDUCATION,
  EXPERIENCES,
  formatLanguageEntry,
  LANGUAGES,
  PERSONAL_INFO,
  PORTFOLIO_CONTENT,
  PROJECTS,
  SKILL_CATEGORIES,
  SUMMARY,
} from "@/constants/data";
import { KNOWLEDGE_BASE, SYSTEM_PROMPT } from "@/constants/knowledgeBase";

export interface AssistantConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type AssistantProvider = "Groq" | "Local knowledge base";

function getGroqClient() {
  const Groq = require("groq-sdk").default;
  return new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
}

function hasGroqConfig() {
  return Boolean(process.env.GROQ_API_KEY);
}

export function getAssistantProvider(): AssistantProvider {
  return hasGroqConfig() ? "Groq" : "Local knowledge base";
}

function includesAny(input: string, terms: string[]) {
  return terms.some((term) => input.includes(term));
}

function formatList(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function formatSkillsForCategory(categoryId: (typeof SKILL_CATEGORIES)[number]["id"]) {
  const category = SKILL_CATEGORIES.find((item) => item.id === categoryId);
  if (!category) return "";

  return formatList(
    category.items.map((skill) => skill.resumeLabel || skill.name).slice(0, 8)
  );
}

async function buildLocalAssistantReply(message: string) {
  const query = message.toLowerCase().trim();
  const firstName = PERSONAL_INFO.name.split(" ")[0];
  const currentRoles = EXPERIENCES.filter((experience) => experience.current);

  const matchedProject = PROJECTS.find((project) =>
    [project.title, project.titleShort]
      .filter(Boolean)
      .some((value) => query.includes(value!.toLowerCase()))
  );

  const matchedExperience = EXPERIENCES.find((experience) =>
    [experience.company, experience.companyShort, experience.title]
      .filter(Boolean)
      .some((value) => query.includes(value!.toLowerCase()))
  );

  if (
    includesAny(query, ["hello", "hi", "hey", "salam"]) &&
    query.split(/\s+/).length <= 6
  ) {
    return `Hi! I'm ${firstName}'s AI assistant. ${firstName} is a ${PERSONAL_INFO.title}. I can help with his experience, key engagements, skills, availability, or the best way to contact him.`;
  }

  if (
    includesAny(query, [
      "contact",
      "email",
      "reach",
      "linkedin",
      "whatsapp",
      "phone",
      "hire",
      "book",
      "connect",
    ])
  ) {
    return `${firstName} can be reached by email at ${PERSONAL_INFO.email}, on LinkedIn at ${PERSONAL_INFO.linkedin}, or by phone/WhatsApp at ${PERSONAL_INFO.phone}. ${PORTFOLIO_CONTENT.engagement.availabilityMessage}`;
  }

  if (includesAny(query, ["price", "pricing", "cost", "salary", "rate", "package"])) {
    return PORTFOLIO_CONTENT.engagement.pricingNote;
  }

  if (
    includesAny(query, [
      "available",
      "availability",
      "notice",
      "start",
      "join",
      "when can",
      "open to work",
      "visa",
      "relocat",
    ])
  ) {
    const details = PORTFOLIO_CONTENT.engagement.timelineEstimates
      .map((item) => `${item.label}: ${item.value}`)
      .join("; ");

    return `${firstName} is open to asset, inventory, and warehouse roles across Dubai and the UAE (${details}). ${PORTFOLIO_CONTENT.engagement.hireMe.ctaDescription}`;
  }

  if (includesAny(query, ["education", "study", "degree", "diploma", "university", "college", "qualification"])) {
    return `${firstName} holds a ${EDUCATION.degree} from ${EDUCATION.university} (${EDUCATION.duration}), and has completed Microsoft Office and quantity-surveying courses.`;
  }

  if (includesAny(query, ["language", "english", "urdu"])) {
    return `${firstName} speaks ${LANGUAGES.map(formatLanguageEntry).join(" and ")}.`;
  }

  if (includesAny(query, ["certificate", "certification", "credential"])) {
    const certifications = CERTIFICATIONS.slice(0, 4).map(
      (certification) => `${certification.title} from ${certification.issuer}`
    );

    return `${firstName}'s certifications include ${formatList(certifications)}.`;
  }

  if (matchedExperience || includesAny(query, ["experience", "work", "job", "current role"])) {
    if (matchedExperience) {
      return `${firstName} worked at ${matchedExperience.company} as ${matchedExperience.title} (${matchedExperience.duration}). ${matchedExperience.description}`;
    }

    const currentRoleSummary = currentRoles.map(
      (experience) =>
        `${experience.title} at ${experience.company} (${experience.duration})`
    );

    return `${firstName}'s current work includes ${formatList(currentRoleSummary)}. He also brings hands-on experience in RFID fixed-asset tagging, fixed-asset audits, inventory control, cycle counting, and warehouse operations.`;
  }

  if (
    matchedProject ||
    includesAny(query, ["project", "portfolio", "built", "build", "case study"])
  ) {
    if (matchedProject) {
      const projectLinkNote = matchedProject.demo
        ? ` You can view it at ${matchedProject.demo}.`
        : matchedProject.website
          ? ` You can learn more at ${matchedProject.website}.`
          : matchedProject.status
            ? ` Current status: ${matchedProject.status}.`
            : "";

      return `${matchedProject.title}: ${matchedProject.resumeDescription}${projectLinkNote}`;
    }

    const featuredProjects = PROJECTS.filter((project) => project.featuredOnResume)
      .slice(0, 4)
      .map((project) => project.titleShort || project.title);

    return `Some of ${firstName}'s key engagements are ${formatList(featuredProjects)}. These span RFID fixed-asset tagging, broadcast asset planning, warehouse supervision, and inventory control.`;
  }

  if (
    includesAny(query, [
      "skill",
      "competenc",
      "expertise",
      "asset",
      "inventory",
      "stock",
      "rfid",
      "barcode",
      "warehouse",
      "audit",
      "reconcil",
      "logistics",
      "tagging",
    ])
  ) {
    if (includesAny(query, ["fixed asset", "asset management", "register", "lifecycle", "depreciation"])) {
      return `${firstName}'s fixed-asset management skills include ${formatSkillsForCategory("frontend")}.`;
    }

    if (includesAny(query, ["inventory", "stock", "cycle count", "fifo", "fefo"])) {
      return `${firstName}'s inventory and stock-control skills include ${formatSkillsForCategory("backend")}.`;
    }

    if (includesAny(query, ["rfid", "barcode", "tracking", "tagging", "scan", "serial"])) {
      return `${firstName}'s RFID and asset-tracking skills include ${formatSkillsForCategory("databases")}.`;
    }

    if (includesAny(query, ["audit", "reconcil", "verification", "report", "discrepan"])) {
      return `${firstName}'s audit, reconciliation, and reporting skills include ${formatSkillsForCategory("aiMl")}.`;
    }

    if (includesAny(query, ["warehouse", "logistics", "shipping", "receiving", "dispatch", "supply chain"])) {
      return `${firstName}'s warehouse and logistics skills include ${formatSkillsForCategory("mobile")}.`;
    }

    if (includesAny(query, ["software", "system", "excel", "tool", "leadership", "supervis", "team"])) {
      return `${firstName} also works with ${formatSkillsForCategory("tooling")}.`;
    }

    return `${firstName}'s core competencies span fixed-asset management, inventory & stock control, RFID & asset tracking, audit & reconciliation, warehouse & logistics, and systems & leadership. For example: ${formatSkillsForCategory("frontend")}, ${formatSkillsForCategory("databases")}.`;
  }

  if (includesAny(query, ["who is", "about", "summary", "introduce", "tell me about"])) {
    return `${firstName} is a ${PERSONAL_INFO.title}. ${SUMMARY}`;
  }

  return `${firstName} is a ${PERSONAL_INFO.title}. ${SUMMARY} If you want something specific, ask about his experience, key engagements, skills, availability, or how to contact him.`;
}

export async function generateAssistantReply(
  message: string,
  conversationHistory: AssistantConversationMessage[] = []
) {
  if (!hasGroqConfig()) {
    return buildLocalAssistantReply(message);
  }

  const messages: AssistantConversationMessage[] = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}\n\nKNOWLEDGE BASE:\n${KNOWLEDGE_BASE}`,
    },
    ...conversationHistory,
    {
      role: "user",
      content: message,
    },
  ];

  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    messages: messages as any,
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    max_tokens: 1024,
    top_p: 1,
    stream: false,
  });

  return (
    completion.choices[0]?.message?.content ||
    "I apologize, but I encountered an error. Please try again."
  );
}
