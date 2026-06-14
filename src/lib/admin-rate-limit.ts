import { createHash } from "node:crypto";

interface AdminLoginRateLimitRow {
  client_key: string;
  attempt_count: number;
  window_started_at: string;
  blocked_until: string | null;
}

interface AdminLoginRateLimitStatus {
  limited: boolean;
  retryAfterSeconds: number;
}

interface LoginAttemptRecord {
  count: number;
  windowStartedAt: number;
  blockedUntil: number;
}

const ADMIN_LOGIN_WINDOW_MS = 10 * 60 * 1000;
const ADMIN_LOGIN_MAX_ATTEMPTS = 5;
const ADMIN_LOGIN_BLOCK_MS = 15 * 60 * 1000;
const memoryLoginAttemptStore = new Map<string, LoginAttemptRecord>();

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function hasSupabaseAdminRateLimitConfig() {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function getClientFingerprint(request: Request) {
  const userAgent = request.headers.get("user-agent") || "unknown";

  return hashValue(`${getClientIp(request)}|${userAgent}`);
}

async function adminRateLimitRest<T>(
  path: string,
  init?: RequestInit,
  query?: URLSearchParams
) {
  const baseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!baseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin rate-limit configuration is missing.");
  }

  const response = await fetch(
    `${baseUrl}/rest/v1${path}${query ? `?${query.toString()}` : ""}`,
    {
      ...init,
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      `Supabase admin rate-limit request failed (${response.status})${message ? `: ${message}` : "."}`
    );
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

async function readAdminLoginRateLimitRow(clientKey: string) {
  const rows = await adminRateLimitRest<AdminLoginRateLimitRow[]>(
    "/admin_login_rate_limits",
    undefined,
    new URLSearchParams({
      select: "client_key,attempt_count,window_started_at,blocked_until",
      client_key: `eq.${clientKey}`,
      limit: "1",
    })
  );

  return rows[0] || null;
}

async function upsertAdminLoginRateLimitRow(row: AdminLoginRateLimitRow) {
  await adminRateLimitRest(
    "/admin_login_rate_limits",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify([row]),
    },
    new URLSearchParams({
      on_conflict: "client_key",
    })
  );
}

async function deleteAdminLoginRateLimitRow(clientKey: string) {
  await adminRateLimitRest(
    "/admin_login_rate_limits",
    {
      method: "DELETE",
      headers: {
        Prefer: "return=minimal",
      },
    },
    new URLSearchParams({
      client_key: `eq.${clientKey}`,
    })
  );
}

function pruneMemoryLoginAttemptStore(now: number) {
  for (const [key, record] of memoryLoginAttemptStore.entries()) {
    if (
      record.blockedUntil <= now &&
      now - record.windowStartedAt > ADMIN_LOGIN_WINDOW_MS
    ) {
      memoryLoginAttemptStore.delete(key);
    }
  }
}

function getMemoryRateLimitStatus(request: Request): AdminLoginRateLimitStatus {
  const now = Date.now();
  const key = getClientFingerprint(request);

  pruneMemoryLoginAttemptStore(now);

  const record = memoryLoginAttemptStore.get(key);

  if (!record) {
    return { limited: false, retryAfterSeconds: 0 };
  }

  if (record.blockedUntil > now) {
    return {
      limited: true,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((record.blockedUntil - now) / 1000)
      ),
    };
  }

  if (now - record.windowStartedAt > ADMIN_LOGIN_WINDOW_MS) {
    memoryLoginAttemptStore.delete(key);
  }

  return { limited: false, retryAfterSeconds: 0 };
}

function recordMemoryLoginFailure(request: Request): AdminLoginRateLimitStatus {
  const now = Date.now();
  const key = getClientFingerprint(request);

  pruneMemoryLoginAttemptStore(now);

  const existing = memoryLoginAttemptStore.get(key);

  if (!existing || now - existing.windowStartedAt > ADMIN_LOGIN_WINDOW_MS) {
    memoryLoginAttemptStore.set(key, {
      count: 1,
      windowStartedAt: now,
      blockedUntil: 0,
    });

    return getMemoryRateLimitStatus(request);
  }

  if (existing.blockedUntil > now) {
    return getMemoryRateLimitStatus(request);
  }

  existing.count += 1;

  if (existing.count >= ADMIN_LOGIN_MAX_ATTEMPTS) {
    existing.blockedUntil = now + ADMIN_LOGIN_BLOCK_MS;
  }

  memoryLoginAttemptStore.set(key, existing);

  return getMemoryRateLimitStatus(request);
}

function clearMemoryLoginFailures(request: Request) {
  memoryLoginAttemptStore.delete(getClientFingerprint(request));
}

export async function getAdminLoginRateLimitStatus(
  request: Request
): Promise<AdminLoginRateLimitStatus> {
  if (!hasSupabaseAdminRateLimitConfig()) {
    return getMemoryRateLimitStatus(request);
  }

  try {
    const now = Date.now();
    const clientKey = getClientFingerprint(request);
    const row = await readAdminLoginRateLimitRow(clientKey);

    if (!row) {
      return { limited: false, retryAfterSeconds: 0 };
    }

    if (row.blocked_until && new Date(row.blocked_until).getTime() > now) {
      return {
        limited: true,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((new Date(row.blocked_until).getTime() - now) / 1000)
        ),
      };
    }

    if (now - new Date(row.window_started_at).getTime() > ADMIN_LOGIN_WINDOW_MS) {
      await deleteAdminLoginRateLimitRow(clientKey);
    }

    return { limited: false, retryAfterSeconds: 0 };
  } catch (error) {
    console.error("Falling back to memory login rate limit:", error);
    return getMemoryRateLimitStatus(request);
  }
}

export async function recordAdminLoginFailure(
  request: Request
): Promise<AdminLoginRateLimitStatus> {
  if (!hasSupabaseAdminRateLimitConfig()) {
    return recordMemoryLoginFailure(request);
  }

  try {
    const now = Date.now();
    const clientKey = getClientFingerprint(request);
    const row = await readAdminLoginRateLimitRow(clientKey);

    if (!row || now - new Date(row.window_started_at).getTime() > ADMIN_LOGIN_WINDOW_MS) {
      await upsertAdminLoginRateLimitRow({
        client_key: clientKey,
        attempt_count: 1,
        window_started_at: new Date(now).toISOString(),
        blocked_until: null,
      });

      return { limited: false, retryAfterSeconds: 0 };
    }

    if (row.blocked_until && new Date(row.blocked_until).getTime() > now) {
      return {
        limited: true,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((new Date(row.blocked_until).getTime() - now) / 1000)
        ),
      };
    }

    const attemptCount = row.attempt_count + 1;
    const blockedUntil =
      attemptCount >= ADMIN_LOGIN_MAX_ATTEMPTS
        ? new Date(now + ADMIN_LOGIN_BLOCK_MS).toISOString()
        : null;

    await upsertAdminLoginRateLimitRow({
      client_key: clientKey,
      attempt_count: attemptCount,
      window_started_at: row.window_started_at,
      blocked_until: blockedUntil,
    });

    return {
      limited: Boolean(blockedUntil),
      retryAfterSeconds: blockedUntil
        ? Math.max(
            1,
            Math.ceil((new Date(blockedUntil).getTime() - now) / 1000)
          )
        : 0,
    };
  } catch (error) {
    console.error("Falling back to memory login rate limit:", error);
    return recordMemoryLoginFailure(request);
  }
}

export async function clearAdminLoginFailures(request: Request) {
  if (!hasSupabaseAdminRateLimitConfig()) {
    clearMemoryLoginFailures(request);
    return;
  }

  try {
    await deleteAdminLoginRateLimitRow(getClientFingerprint(request));
  } catch (error) {
    console.error("Falling back to memory login rate limit:", error);
    clearMemoryLoginFailures(request);
  }
}
