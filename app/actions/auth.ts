"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  getSessionCookie,
  setSessionCookie,
} from "@/lib/auth/session";
import {
  loginSchema,
  registerSchema,
  zodFieldErrors,
} from "@/lib/validations/auth";
import { randomUUID } from "crypto";

export type ActionState = {
  success: boolean;
  errors?: Record<string, string>;
};

export async function register(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, errors: zodFieldErrors(parsed.error) };
  }

  const { fullName, email, password } = parsed.data;
  const db = getDb();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return { success: false, errors: { email: "อีเมลนี้ถูกใช้งานแล้ว" } };
  }

  try {
    const userId = randomUUID();
    const passwordHash = await hashPassword(password);
    await db.insert(users).values({
      id: userId,
      fullName,
      email,
      passwordHash,
      createdAt: Date.now(),
    });

    const sessionId = await createSession(db, userId);
    await setSessionCookie(sessionId);
  } catch (error) {
    console.error("register error:", error);
    return { success: false, errors: { _form: "เกิดข้อผิดพลาด กรุณาลองใหม่" } };
  }

  redirect("/dashboard");
}

export async function login(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, errors: zodFieldErrors(parsed.error) };
  }

  const { email, password } = parsed.data;
  const db = getDb();

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return {
      success: false,
      errors: { _form: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
    };
  }

  const sessionId = await createSession(db, user.id);
  await setSessionCookie(sessionId);
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  const sessionId = await getSessionCookie();
  if (sessionId) {
    await deleteSession(getDb(), sessionId);
  }
  await clearSessionCookie();
  redirect("/");
}
