import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type AnalyticsEventKind = "view" | "share";

const BOT_USER_AGENT_PATTERN =
  /(bot|crawler|spider|preview|facebookexternalhit|slackbot|discordbot|whatsapp|telegrambot|linkedinbot|headlesschrome|python-requests|curl|wget)/i;
const ANALYTICS_EVENT_TTL_SECONDS: Record<AnalyticsEventKind, number> = {
  view: 60 * 60 * 6,
  share: 60 * 15,
};

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeOrigin(value: string) {
  return value.replace(/\/+$/, "");
}

function getRequestOrigin(request: Request) {
  return normalizeOrigin(new URL(request.url).origin);
}

function getAnalyticsCookieName(kind: AnalyticsEventKind, slug: string) {
  return `portfolio_blog_${kind}_${hashValue(slug).slice(0, 18)}`;
}

export function rejectIfNotSameOrigin(request: NextRequest) {
  const requestOrigin = getRequestOrigin(request);
  const originHeader = request.headers.get("origin");

  if (originHeader && normalizeOrigin(originHeader) !== requestOrigin) {
    return NextResponse.json(
      { error: "Cross-site requests are not allowed." },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  const refererHeader = request.headers.get("referer");

  if (refererHeader) {
    try {
      if (normalizeOrigin(new URL(refererHeader).origin) !== requestOrigin) {
        return NextResponse.json(
          { error: "Cross-site requests are not allowed." },
          { status: 403, headers: { "Cache-Control": "no-store" } }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Cross-site requests are not allowed." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
  }

  const fetchSite = request.headers.get("sec-fetch-site");

  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site") {
    return NextResponse.json(
      { error: "Cross-site requests are not allowed." },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  return null;
}
export function isLikelyAutomatedRequest(request: Request) {
  const userAgent = request.headers.get("user-agent") || "";
  return BOT_USER_AGENT_PATTERN.test(userAgent);
}

export function hasRecentAnalyticsEvent(
  request: NextRequest,
  kind: AnalyticsEventKind,
  slug: string
) {
  return Boolean(request.cookies.get(getAnalyticsCookieName(kind, slug))?.value);
}

export function attachAnalyticsEventCookie(
  response: NextResponse,
  kind: AnalyticsEventKind,
  slug: string
) {
  response.cookies.set({
    name: getAnalyticsCookieName(kind, slug),
    value: "1",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ANALYTICS_EVENT_TTL_SECONDS[kind],
  });
}
