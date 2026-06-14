// ============================================================
// Shared Supabase REST helper + admin notifications
// ------------------------------------------------------------
// This module holds the generic Supabase REST client and the
// admin-notification CRUD that used to live in the (now removed)
// blog repository. It is shared by the notification system and the
// outreach/job-automation subsystem. No blog coupling.
// ============================================================

const SUPABASE_TIMEOUT_MS = 15_000;

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function hasSupabaseConfig() {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

function ensureSupabaseConfig() {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase configuration is missing.");
  }
}

export async function supabaseRest<T>(
  path: string,
  init?: RequestInit,
  query?: URLSearchParams,
): Promise<T> {
  const baseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!baseUrl || !serviceRoleKey) {
    throw new Error("Supabase configuration is missing.");
  }

  const url = `${baseUrl}/rest/v1${path}${query ? `?${query.toString()}` : ""}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
    signal: init?.signal ?? AbortSignal.timeout(SUPABASE_TIMEOUT_MS),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${text}`);
  }

  if (response.status === 204) {
    return null as T;
  }
  const text = await response.text();

  if (!text) {
    return null as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch (error: any) {
    throw new Error(
      `Supabase response parse failed (${response.status}): ${error.message}`,
    );
  }
}

// --- Admin Notifications ---

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function createAdminNotification(notification: {
  type: string;
  title: string;
  message: string;
  severity: string;
  metadata?: Record<string, unknown>;
}) {
  if (!hasSupabaseConfig()) {
    return;
  }

  try {
    await supabaseRest("/admin_notifications", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([
        {
          type: notification.type,
          title: notification.title,
          message: notification.message,
          severity: notification.severity,
          metadata: notification.metadata || {},
          read: false,
        },
      ]),
    });
  } catch {
    console.error("Failed to create admin notification (non-fatal).");
  }
}

export async function getAdminNotifications(options: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
} = {}): Promise<AdminNotification[]> {
  ensureSupabaseConfig();

  const query = new URLSearchParams({
    select: "*",
    order: "created_at.desc",
    limit: String(options.limit || 30),
    offset: String(options.offset || 0),
  });

  if (options.unreadOnly) {
    query.set("read", "eq.false");
  }

  return supabaseRest<AdminNotification[]>(
    "/admin_notifications",
    undefined,
    query,
  );
}

export async function markNotificationRead(id: string) {
  ensureSupabaseConfig();

  await supabaseRest(
    "/admin_notifications",
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ read: true }),
    },
    new URLSearchParams({ id: `eq.${id}` }),
  );
}

export async function markAllNotificationsRead() {
  ensureSupabaseConfig();

  await supabaseRest(
    "/admin_notifications",
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ read: true }),
    },
    new URLSearchParams({ read: "eq.false" }),
  );
}
