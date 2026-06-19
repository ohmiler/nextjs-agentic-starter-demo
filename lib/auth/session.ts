import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import type { Db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "./constants";

function generateSessionId(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(db: Db, userId: string): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = Date.now() + SESSION_MAX_AGE_MS;

  await db.insert(sessions).values({ id: sessionId, userId, expiresAt });
  return sessionId;
}

export async function validateSession(db: Db, sessionId: string) {
  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const sessionRow = await db
    .select({ expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!sessionRow[0] || sessionRow[0].expiresAt <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  return row;
}

export async function deleteSession(db: Db, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function setSessionCookie(sessionId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}

export async function getCurrentUser() {
  const sessionId = await getSessionCookie();
  if (!sessionId) return null;
  return validateSession(getDb(), sessionId);
}
