import { afterEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { hashPassword } from "./password";
import {
  createSession,
  deleteSession,
  validateSession,
} from "./session";

describe("session", () => {
  const db = createTestDb();
  const userId = "user-1";

  afterEach(async () => {
    await db.delete(sessions);
    await db.delete(users);
  });

  async function seedUser() {
    await db.insert(users).values({
      id: userId,
      fullName: "สมชาย ใจดี",
      email: "test@example.com",
      passwordHash: await hashPassword("password123"),
      createdAt: Date.now(),
    });
  }

  it("creates and validates a session", async () => {
    await seedUser();
    const sessionId = await createSession(db, userId);
    const user = await validateSession(db, sessionId);
    expect(user?.email).toBe("test@example.com");
  });

  it("returns null for expired session", async () => {
    await seedUser();
    const sessionId = "expired-session";
    await db.insert(sessions).values({
      id: sessionId,
      userId,
      expiresAt: Date.now() - 1000,
    });
    const user = await validateSession(db, sessionId);
    expect(user).toBeNull();
  });

  it("deletes session on logout", async () => {
    await seedUser();
    const sessionId = await createSession(db, userId);
    await deleteSession(db, sessionId);
    const user = await validateSession(db, sessionId);
    expect(user).toBeNull();
  });
});
