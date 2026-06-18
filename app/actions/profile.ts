"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  changePasswordSchema,
  updateProfileSchema,
} from "@/lib/validations/profile";
import { zodFieldErrors } from "@/lib/validations/auth";
import type { ActionState } from "./auth";

export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, errors: { _form: "กรุณาเข้าสู่ระบบใหม่" } };
  }

  const parsed = updateProfileSchema.safeParse({
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    return { success: false, errors: zodFieldErrors(parsed.error) };
  }

  await getDb()
    .update(users)
    .set({ fullName: parsed.data.fullName })
    .where(eq(users.id, user.id));

  return { success: true };
}

export async function changePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, errors: { _form: "กรุณาเข้าสู่ระบบใหม่" } };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { success: false, errors: zodFieldErrors(parsed.error) };
  }

  const db = getDb();
  const rows = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  const row = rows[0];
  if (
    !row ||
    !(await verifyPassword(parsed.data.currentPassword, row.passwordHash))
  ) {
    return { success: false, errors: { currentPassword: "รหัสผ่านเดิมไม่ถูกต้อง" } };
  }

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return {
      success: false,
      errors: { newPassword: "รหัสผ่านใหม่ต้องแตกต่างจากเดิม" },
    };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

  return { success: true };
}
