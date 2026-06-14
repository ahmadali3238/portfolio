"use client";

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  EDUCATION,
  formatLanguageEntry,
  LANGUAGES,
  META,
  PERSONAL_INFO,
  PROFESSIONAL_SUMMARY,
  RESUME_CERTIFICATIONS,
  RESUME_EXPERIENCES,
  RESUME_PROJECTS,
  RESUME_SKILL_GROUPS,
} from "@/constants/data";

const colors = {
  text: "#000000",
  muted: "#000000",
  border: "#4B5563",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 32,
    paddingHorizontal: 36,
    color: colors.text,
    fontSize: 10,
    lineHeight: 1.2,
  },
  header: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    lineHeight: 1.2,
  },
  title: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 1.2,
  },
  headerLine: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 1.2,
    color: colors.text,
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    lineHeight: 1.2,
    letterSpacing: 0.6,
    paddingBottom: 2,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paragraph: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 1.2,
  },
  skillRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  skillLabel: {
    width: 118,
    fontWeight: "bold",
    fontSize: 10,
    lineHeight: 1.2,
  },
  skillValue: {
    flex: 1,
    color: colors.muted,
    fontSize: 10,
    lineHeight: 1.2,
  },
  item: {
    marginBottom: 6,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  itemHeaderMain: {
    flex: 1,
    paddingRight: 8,
  },
  itemTitle: {
    fontSize: 10,
    fontWeight: "bold",
    lineHeight: 1.2,
    marginBottom: 1,
  },
  itemMeta: {
    width: 120,
    textAlign: "right",
    fontSize: 10,
    lineHeight: 1.2,
    color: colors.muted,
  },
  subheading: {
    fontSize: 10,
    lineHeight: 1.2,
    color: colors.muted,
    marginBottom: 3,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 1,
  },
  bulletMark: {
    width: 8,
    fontSize: 10,
    lineHeight: 1.2,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.2,
    color: colors.muted,
  },
  detailLine: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 1.2,
    color: colors.text,
  },
  compactLine: {
    fontSize: 10,
    lineHeight: 1.2,
    color: colors.muted,
  },
});

const formatVisibleUrl = (url: string) => url.replace(/^https?:\/\//, "");

const resumeSkillGroups = Array.isArray(RESUME_SKILL_GROUPS)
  ? RESUME_SKILL_GROUPS
  : [];
const resumeExperiences = Array.isArray(RESUME_EXPERIENCES)
  ? RESUME_EXPERIENCES
  : [];
const resumeProjects = Array.isArray(RESUME_PROJECTS) ? RESUME_PROJECTS : [];
const resumeCertifications = Array.isArray(RESUME_CERTIFICATIONS)
  ? RESUME_CERTIFICATIONS
  : [];
const resumeLanguages = Array.isArray(LANGUAGES) ? LANGUAGES : [];

const resumeKeywords = resumeSkillGroups
  .flatMap((group) => group.items)
  .slice(0, 20)
  .join(", ");

const getPrimaryProjectLink = (
  project: (typeof resumeProjects)[number]
): { label: string; url: string } | null => {
  if (project.demo) {
    return {
      label: project.demoLabel || "Live Demo",
      url: project.demo,
    };
  }

  if (project.website) {
    return {
      label: project.websiteLabel || "Website",
      url: project.website,
    };
  }

  if (project.github) {
    return {
      label: "GitHub",
      url: project.github,
    };
  }

  return null;
};

const ResumePDF = () => (
  <Document
    title={`${PERSONAL_INFO.name} - ${META.documentType}`}
    author={PERSONAL_INFO.name}
    subject="Professional resume"
    keywords={resumeKeywords}
  >
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.name}>{PERSONAL_INFO.name}</Text>
        <Text style={styles.title}>{PERSONAL_INFO.title}</Text>
        <Text style={styles.headerLine}>
          Location: {PERSONAL_INFO.city}, {PERSONAL_INFO.location} | Phone:{" "}
          {PERSONAL_INFO.phone} | Email: {PERSONAL_INFO.email}
        </Text>
        <Text style={styles.headerLine}>
          Portfolio: {PERSONAL_INFO.portfolio}
        </Text>
        <Text style={styles.headerLine}>
          LinkedIn: {PERSONAL_INFO.linkedin}
          {PERSONAL_INFO.github ? ` | GitHub: ${PERSONAL_INFO.github}` : ""}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Professional Summary</Text>
        <Text style={styles.paragraph}>{PROFESSIONAL_SUMMARY}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Technical Skills</Text>
        {resumeSkillGroups.map((group) => (
          <View key={group.title} style={styles.skillRow}>
            <Text style={styles.skillLabel}>{group.title}</Text>
            <Text style={styles.skillValue}>{group.items.join(", ")}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Professional Experience</Text>
        {resumeExperiences.map((experience) => (
          <View
            key={`${experience.company}-${experience.title}`}
            style={styles.item}
            wrap={false}
          >
            <View style={styles.itemHeader}>
              <View style={styles.itemHeaderMain}>
                <Text style={styles.itemTitle}>{experience.title}</Text>
                <Text style={styles.subheading}>
                  {experience.company} | {experience.location}
                </Text>
              </View>
              <Text style={styles.itemMeta}>{experience.duration}</Text>
            </View>

            {experience.highlights.map((highlight) => (
              <View key={highlight} style={styles.bulletRow}>
                <Text style={styles.bulletMark}>-</Text>
                <Text style={styles.bulletText}>{highlight}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Engagements</Text>
        {resumeProjects.map((project) => {
          const primaryLink = getPrimaryProjectLink(project);

          return (
            <View key={project.title} style={styles.item}>
              <View style={styles.itemHeader}>
                <View style={styles.itemHeaderMain}>
                  <Text style={styles.itemTitle}>
                    {project.titleShort || project.title}
                  </Text>
                </View>
                <Text style={styles.itemMeta}>{project.duration}</Text>
              </View>

              {project.resumeHighlights.map((highlight) => (
                <View
                  key={`${project.slug}-${highlight}`}
                  style={styles.bulletRow}
                >
                  <Text style={styles.bulletMark}>-</Text>
                  <Text style={styles.bulletText}>{highlight}</Text>
                </View>
              ))}

              {primaryLink && (
                <Text style={styles.detailLine}>
                  {primaryLink.label}: {formatVisibleUrl(primaryLink.url)}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Education</Text>
        <View style={styles.itemHeader}>
          <View style={styles.itemHeaderMain}>
            <Text style={styles.itemTitle}>{EDUCATION.degree}</Text>
            <Text style={styles.subheading}>
              {EDUCATION.university} | {EDUCATION.location}
            </Text>
          </View>
          <Text style={styles.itemMeta}>{EDUCATION.duration}</Text>
        </View>
        {EDUCATION.cgpa ? (
          <Text style={styles.compactLine}>CGPA: {EDUCATION.cgpa}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Certifications</Text>
        {resumeCertifications.map((certification) => (
          <View key={certification.title} style={styles.item} wrap={false}>
            <View style={styles.itemHeader}>
              <View style={styles.itemHeaderMain}>
                <Text style={styles.itemTitle}>{certification.title}</Text>
                <Text style={styles.subheading}>{certification.issuer}</Text>
              </View>
              <Text style={styles.itemMeta}>{certification.duration}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Languages</Text>
        {resumeLanguages.map((language) => (
          <View key={language.language} style={styles.bulletRow}>
            <Text style={styles.bulletMark}>-</Text>
            <Text style={styles.bulletText}>{formatLanguageEntry(language)}</Text>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

export default ResumePDF;
