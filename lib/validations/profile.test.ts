import { describe, expect, it } from "vitest";
import { changePasswordSchema, updateProfileSchema } from "./profile";

describe("updateProfileSchema", () => {
  it("accepts valid name", () => {
    const result = updateProfileSchema.safeParse({ fullName: "สมหญิง รักเรียน" });
    expect(result.success).toBe(true);
  });
});

describe("changePasswordSchema", () => {
  it("accepts matching new passwords", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "oldpassword",
      newPassword: "newpassword1",
      confirmPassword: "newpassword1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched confirm", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "oldpassword",
      newPassword: "newpassword1",
      confirmPassword: "different1",
    });
    expect(result.success).toBe(false);
  });
});
