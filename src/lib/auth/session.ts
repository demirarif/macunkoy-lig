import "server-only";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

/**
 * Oturum yönetimi.
 *
 * İki ayrı çerez kullanıyoruz: menajer oturumu ve admin oturumu.
 * Bilerek ayrı — kullanıcının kendi hesabı hiçbir koşulda admin paneline
 * erişemesin, admin de menajer olarak oynamak isterse ayrıca giriş yapsın.
 */

const MANAGER_COOKIE = "mfl_manager";
const ADMIN_COOKIE = "mfl_admin";
const MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "SESSION_SECRET tanımlı değil veya 32 karakterden kısa. .env.local dosyasını kontrol et.",
    );
  }
  return new TextEncoder().encode(value);
}

async function sign(payload: Record<string, string>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
}

async function verify(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

export async function startManagerSession(managerId: string): Promise<void> {
  const jar = await cookies();
  jar.set(MANAGER_COOKIE, await sign({ managerId }), cookieOptions());
}

export async function getManagerId(): Promise<string | null> {
  const token = (await cookies()).get(MANAGER_COOKIE)?.value;
  if (!token) return null;
  const payload = await verify(token);
  return typeof payload?.managerId === "string" ? payload.managerId : null;
}

export async function endManagerSession(): Promise<void> {
  (await cookies()).delete(MANAGER_COOKIE);
}

export async function startAdminSession(username: string): Promise<void> {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, await sign({ admin: username }), cookieOptions());
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const payload = await verify(token);
  return typeof payload?.admin === "string";
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}
