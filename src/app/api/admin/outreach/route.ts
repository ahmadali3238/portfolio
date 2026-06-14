import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getOutreachLeads, getOutreachStats, getLeadThread, hasOutreachConfig } from "@/lib/outreach/repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasOutreachConfig()) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const sp = request.nextUrl.searchParams;
  const view = sp.get("view") || "leads";
  try {
    if (view === "stats") return NextResponse.json({ stats: await getOutreachStats() }, { headers: { "Cache-Control": "no-store" } });
    if (view === "thread") {
      const leadId = sp.get("leadId");
      if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });
      return NextResponse.json(await getLeadThread(leadId), { headers: { "Cache-Control": "no-store" } });
    }
    const leads = await getOutreachLeads({ status: sp.get("status") || "all", segment: sp.get("segment") || undefined, limit: Number(sp.get("limit") || 100) });
    return NextResponse.json({ leads }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
