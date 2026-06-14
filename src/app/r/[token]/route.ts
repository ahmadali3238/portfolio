import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { messageByToken, recordClick } from "@/lib/outreach/repository";

export const dynamic = "force-dynamic";

/** Tracked redirect: logs a first-party click, then 302s to the real destination. */
export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const url = new URL(request.url);
  const target = url.searchParams.get("u") || "link";
  const to = url.searchParams.get("to") || "";
  const dest = /^https?:\/\//.test(to) ? to : process.env.NEXT_PUBLIC_SITE_URL || "https://ahmadali3238.vercel.app";

  try {
    const msg = await messageByToken(params.token);
    if (msg) {
      const ip = request.headers.get("x-forwarded-for") || "";
      await recordClick(msg, target, {
        ua: request.headers.get("user-agent") || undefined,
        ipHash: ip ? createHash("sha256").update(ip).digest("hex").slice(0, 16) : undefined,
      });
    }
  } catch {
    // never block the redirect on a tracking failure
  }
  return NextResponse.redirect(dest, 302);
}
