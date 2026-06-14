import { ImageResponse } from "next/og";
import {
  PERSONAL_INFO,
  PORTFOLIO_CONTENT,
  SKILLS,
  SEO_TITLE,
} from "@/constants/data";

export const socialImageSize = {
  width: 1200,
  height: 630,
};

export const socialImageContentType = "image/png";
export const socialImageAlt = `${PERSONAL_INFO.name} portfolio preview`;

const highlightedSkills = SKILLS.slice(0, 5);

export function generateSocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background:
            "linear-gradient(135deg, #050816 0%, #0f172a 50%, #123463 100%)",
          color: "#f8fafc",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              color: "#93c5fd",
              fontSize: "28px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "9999px",
                backgroundColor: "#38bdf8",
                boxShadow: "0 0 30px rgba(56, 189, 248, 0.6)",
              }}
            />
            Portfolio
          </div>
          <div
            style={{
              padding: "12px 18px",
              borderRadius: "9999px",
              border: "1px solid rgba(148, 163, 184, 0.35)",
              backgroundColor: "rgba(15, 23, 42, 0.5)",
              fontSize: "24px",
              color: "#cbd5e1",
            }}
          >
            Dubai, UAE
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              fontSize: "72px",
              fontWeight: 800,
              lineHeight: 1.05,
              maxWidth: "960px",
            }}
          >
            {SEO_TITLE}
          </div>
          <div
            style={{
              fontSize: "32px",
              lineHeight: 1.35,
              color: "#cbd5e1",
              maxWidth: "980px",
            }}
          >
            {PORTFOLIO_CONTENT.summaries.seo}
          </div>
        </div>

        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
          {highlightedSkills.map((skill) => (
            <div
              key={skill}
              style={{
                display: "flex",
                padding: "12px 18px",
                borderRadius: "9999px",
                backgroundColor: "rgba(15, 23, 42, 0.72)",
                border: "1px solid rgba(125, 211, 252, 0.28)",
                color: "#e2e8f0",
                fontSize: "24px",
              }}
            >
              {skill}
            </div>
          ))}
        </div>
      </div>
    ),
    socialImageSize
  );
}
