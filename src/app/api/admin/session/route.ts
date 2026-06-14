import { NextRequest, NextResponse } from "next/server";
import {
  buildAdminLogoutCookie,
  buildAdminSessionCookie,
  getAdminSession,
  verifyAdminCredentials,
} from "@/lib/admin-auth";
import {
  clearAdminLoginFailures,
  getAdminLoginRateLimitStatus,
  recordAdminLoginFailure,
} from "@/lib/admin-rate-limit";
import {
  rejectIfNotSameOrigin,
} from "@/lib/request-security";

export async function GET() {
  const session = getAdminSession();

  return NextResponse.json(
    {
      authenticated: Boolean(session),
      session,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  const sameOriginResponse = rejectIfNotSameOrigin(request);

  if (sameOriginResponse) {
    return sameOriginResponse;
  }

  try {
    const rateLimitStatus = await getAdminLoginRateLimitStatus(request);

    if (rateLimitStatus.limited) {
      return NextResponse.json(
        {
          error: `Too many login attempts. Try again in ${rateLimitStatus.retryAfterSeconds} seconds.`,
        },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(rateLimitStatus.retryAfterSeconds),
          },
        }
      );
    }

    const body = await request.json();
    const email = String(body?.email || "");
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const isValid = verifyAdminCredentials(email, password);

    if (!isValid) {
      const failureStatus = await recordAdminLoginFailure(request);

      return NextResponse.json(
        {
          error: failureStatus.limited
            ? `Too many login attempts. Try again in ${failureStatus.retryAfterSeconds} seconds.`
            : "Invalid admin credentials.",
        },
        {
          status: failureStatus.limited ? 429 : 401,
          headers: {
            "Cache-Control": "no-store",
            ...(failureStatus.limited
              ? {
                  "Retry-After": String(failureStatus.retryAfterSeconds),
                }
              : {}),
          },
        }
      );
    }

    await clearAdminLoginFailures(request);

    const response = NextResponse.json(
      {
        authenticated: true,
        session: {
          email,
          role: "admin",
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
    response.cookies.set(buildAdminSessionCookie(email));

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to sign in." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const sameOriginResponse = rejectIfNotSameOrigin(request);

  if (sameOriginResponse) {
    return sameOriginResponse;
  }

  const response = NextResponse.json(
    { authenticated: false },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
  response.cookies.set(buildAdminLogoutCookie());

  return response;
}
