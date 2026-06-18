import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "กรุณากรอกชื่อ-นามสกุล (2–100 ตัวอักษร)")
    .max(100, "กรุณากรอกชื่อ-นามสกุล (2–100 ตัวอักษร)"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "กรุณากรอกรหัสผ่านเดิม"),
    newPassword: z
      .string()
      .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "รหัสผ่านยืนยันไม่ตรงกัน",
    path: ["confirmPassword"],
  });
