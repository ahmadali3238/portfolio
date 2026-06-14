import { NextRequest, NextResponse } from "next/server";
import { messageByToken, recordOpen } from "@/lib/outreach/repository";

export const dynamic = "force-dynamic";

const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

/** Optional 1x1 open-tracking pixel (OFF by default in the worker — pixels hurt deliverability). */
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const msg = await messageByToken(params.token);
    if (msg) await recordOpen(msg);
  } catch { /* ignore */ }
  return new NextResponse(GIF, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate", "Content-Length": String(GIF.length) },
  });
}
