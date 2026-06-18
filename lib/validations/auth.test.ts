import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./auth";

describe("registerSchema", () => {
  it("accepts valid input", () => {
    const result = registerSchema.safeParse({
      fullName: "สมชาย ใจดี",
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short password", () => {
    const result = registerSchema.safeParse({
      fullName: "สมชาย ใจดี",
      email: "test@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      fullName: "สมชาย ใจดี",
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid input", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });
});
