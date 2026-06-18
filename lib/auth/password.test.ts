import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("password123");
    expect(hash).not.toBe("password123");
    expect(await verifyPassword("password123", hash)).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("password123");
    expect(await verifyPassword("wrongpass", hash)).toBe(false);
  });
});
