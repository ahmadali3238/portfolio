import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import {
  getAdminNotifications,
  markAllNotificationsRead,
} from "@/lib/notifications/in-app";
import { rejectIfNotSameOrigin } from "@/lib/request-security";

export async function GET(request: NextRequest) {
  const session = getAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const unreadOnly = request.nextUrl.searchParams.get("unread") === "true";
    const notifications = await getAdminNotifications({
      limit: 50,
      unreadOnly,
    });

    return NextResponse.json({ notifications });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch notifications." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const sameOriginResponse = rejectIfNotSameOrigin(request);

  if (sameOriginResponse) {
    return sameOriginResponse;
  }

  const session = getAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    if (body?.action === "read-all") {
      await markAllNotificationsRead();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to process notification action." },
      { status: 500 },
    );
  }
}
