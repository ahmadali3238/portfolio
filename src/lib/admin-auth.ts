import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const ADMIN_SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-portfolio_admin_session"
    : "portfolio_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

interface AdminSessionPayload {
  email: string;
  role: "admin";
  exp: number;
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));

  return Buffer.from(`${normalized}${padding}`, "base64");
}

function getAdminEmail() {
  return process.env.ADMIN_EMAIL || "";
}

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "";
}

function getAdminPasswordHash() {
  return process.env.ADMIN_PASSWORD_HASH || "";
}

function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.BLOG_GENERATION_SECRET || "";
}

function getExpectedSignature(payload: string) {
  const secret = getAdminSessionSecret();

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is required for admin authentication.");
  }

  return base64UrlEncode(
    createHmac("sha256", secret).update(payload).digest()
  );
}

function verifyScryptHash(password: string, storedHash: string) {
  const [algorithm, salt, hash] = storedHash.split("$");

  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password, Buffer.from(salt, "base64url"), expected.length);

  return timingSafeEqual(actual, expected);
}

export function hashPasswordForAdmin(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);

  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyAdminCredentials(email: string, password: string) {
  const adminEmail = getAdminEmail();
  const passwordHash = getAdminPasswordHash();
  const plainPassword = getAdminPassword();

  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL is not configured.");
  }

  if (!passwordHash && !plainPassword) {
    throw new Error("Set ADMIN_PASSWORD_HASH or ADMIN_PASSWORD for admin login.");
  }

  if (email.trim().toLowerCase() !== adminEmail.trim().toLowerCase()) {
    return false;
  }

  if (passwordHash) {
    return verifyScryptHash(password, passwordHash);
  }

  const passwordBuffer = Buffer.from(password);
  const expectedBuffer = Buffer.from(plainPassword);

  if (passwordBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(passwordBuffer, expectedBuffer);
}

export function createAdminSessionToken(email: string) {
  const payload = JSON.stringify({
    email,
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  } satisfies AdminSessionPayload);
  const encodedPayload = base64UrlEncode(payload);
  const signature = getExpectedSignature(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined): AdminSessionPayload | null {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  try {
    const expectedSignature = getExpectedSignature(payload);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return null;
    }

    const decoded = JSON.parse(base64UrlDecode(payload).toString("utf8")) as AdminSessionPayload;

    if (decoded.exp < Math.floor(Date.now() / 1000) || decoded.role !== "admin") {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export function getAdminSession() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;

  return verifyAdminSessionToken(token);
}

export function requireAdminSession(next?: string) {
  const session = getAdminSession();

  if (!session) {
    redirect(next ? `/admin/login?next=${encodeURIComponent(next)}` : "/admin/login");
  }

  return session;
}

export function buildAdminSessionCookie(email: string) {
  return {
    name: ADMIN_SESSION_COOKIE,
    value: createAdminSessionToken(email),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function buildAdminLogoutCookie() {
  return {
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 0,
  };
}
