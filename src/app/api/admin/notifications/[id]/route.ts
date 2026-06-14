import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { markNotificationRead } from "@/lib/notifications/in-app";
import { rejectIfNotSameOrigin } from "@/lib/request-security";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const sameOriginResponse = rejectIfNotSameOrigin(request);

  if (sameOriginResponse) {
    return sameOriginResponse;
  }

  const session = getAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await markNotificationRead(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to mark notification as read." },
      { status: 500 },
    );
  }
}
