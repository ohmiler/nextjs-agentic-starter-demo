# ระบบสมาชิกชมรม dev ยุค ai — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้างระบบสมัครสมาชิก, login/logout, โปรไฟล์, และรายชื่อสมาชิก public ด้วย Next.js 16 + SQLite

**Architecture:** Drizzle ORM กับ `better-sqlite3` เก็บ users/sessions, bcrypt hash รหัสผ่าน, session ID ใน HTTP-only cookie + validate กับ DB ใน Server Components/Actions. Next.js 16 ใช้ `proxy.ts` (ไม่ใช่ `middleware.ts`) ตรวจ cookie เบื้องต้นบน protected routes; validation เต็มรูปแบบทำใน layout/page.

**Tech Stack:** Next.js 16, React 19, Drizzle ORM, better-sqlite3, bcrypt, Zod, Tailwind CSS 4, Vitest

**Spec:** `docs/superpowers/specs/2026-06-18-dev-yuk-ai-membership-design.md`

---

## File Map

| File | Responsibility |
|------|----------------|
| `lib/db/schema.ts` | Drizzle table definitions |
| `lib/db/index.ts` | SQLite connection singleton |
| `lib/auth/password.ts` | bcrypt hash/verify |
| `lib/auth/session.ts` | create/validate/delete session + cookie helpers |
| `lib/validations/auth.ts` | Zod schemas สำหรับ register/login |
| `lib/validations/profile.ts` | Zod schemas สำหรับ profile/password |
| `lib/members.ts` | query รายชื่อสมาชิก + count |
| `app/actions/auth.ts` | register, login, logout Server Actions |
| `app/actions/profile.ts` | updateProfile, changePassword |
| `app/components/navbar.tsx` | Navbar ภาษาไทย ตาม session |
| `app/components/form-field.tsx` | reusable input + error label |
| `app/(auth)/login/page.tsx` | หน้า login |
| `app/(auth)/register/page.tsx` | หน้า register |
| `app/(protected)/layout.tsx` | validate session ก่อน render protected pages |
| `app/(protected)/dashboard/page.tsx` | หน้า dashboard |
| `app/(protected)/profile/page.tsx` | หน้า profile |
| `app/members/page.tsx` | รายชื่อสมาชิก public |
| `app/page.tsx` | หน้าแรก |
| `proxy.ts` | redirect ถ้าไม่มี session cookie บน protected paths |
| `drizzle.config.ts` | Drizzle Kit config |
| `.env.local` | `DATABASE_PATH`, `SESSION_SECRET` |

---

### Task 1: Dependencies, Environment & Vitest

**Files:**
- Modify: `package.json`
- Create: `.env.local`
- Create: `.env.example`
- Modify: `.gitignore`
- Create: `vitest.config.mts`

- [ ] **Step 1: Install production dependencies**

Run:
```bash
npm install drizzle-orm better-sqlite3 bcrypt zod
npm install -D drizzle-kit @types/better-sqlite3 @types/bcrypt vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths
```

Expected: packages added to `node_modules` without errors.

- [ ] **Step 2: Add npm scripts**

Modify `package.json` scripts section:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  }
}
```

- [ ] **Step 3: Create vitest config**

Create `vitest.config.mts`:
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Create environment files**

Create `.env.example`:
```env
DATABASE_PATH=./data/club.db
SESSION_SECRET=change-me-to-a-long-random-string
```

Create `.env.local` (copy from example, generate random secret):
```env
DATABASE_PATH=./data/club.db
SESSION_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

- [ ] **Step 5: Update .gitignore**

Append to `.gitignore`:
```
/data/
/drizzle/
```

- [ ] **Step 6: Verify vitest runs**

Run: `npm run test`
Expected: "No test files found" exit code 0 (or pass with 0 tests)

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.mts .env.example .gitignore
git commit -m "chore: add auth dependencies, vitest, and env template"
```

---

### Task 2: Database Schema & Connection

**Files:**
- Create: `lib/db/schema.ts`
- Create: `lib/db/index.ts`
- Create: `drizzle.config.ts`

- [ ] **Step 1: Write Drizzle schema**

Create `lib/db/schema.ts`:
```typescript
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    index("idx_sessions_user_id").on(table.userId),
    index("idx_sessions_expires_at").on(table.expiresAt),
  ],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
```

- [ ] **Step 2: Write DB connection**

Create `lib/db/index.ts`:
```typescript
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (db) return db;

  const dbPath =
    process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "club.db");
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite, { schema });
  return db;
}

/** For tests — in-memory DB */
export function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const testDb = drizzle(sqlite, { schema });

  sqlite.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
  `);

  return testDb;
}
```

- [ ] **Step 3: Create drizzle config**

Create `drizzle.config.ts`:
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? "./data/club.db",
  },
});
```

- [ ] **Step 4: Generate and run migration**

Run:
```bash
npm run db:generate
npm run db:migrate
```

Expected: `drizzle/` folder created, `data/club.db` exists with tables.

- [ ] **Step 5: Commit**

```bash
git add lib/db/schema.ts lib/db/index.ts drizzle.config.ts drizzle/
git commit -m "feat: add SQLite schema and Drizzle connection"
```

---

### Task 3: Password Utilities (TDD)

**Files:**
- Create: `lib/auth/password.ts`
- Create: `lib/auth/password.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/auth/password.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- lib/auth/password.test.ts`
Expected: FAIL — `hashPassword` not exported

- [ ] **Step 3: Implement password utilities**

Create `lib/auth/password.ts`:
```typescript
import bcrypt from "bcrypt";

const COST = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- lib/auth/password.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/auth/password.ts lib/auth/password.test.ts
git commit -m "feat: add bcrypt password hash and verify utilities"
```

---

### Task 4: Zod Validation Schemas (TDD)

**Files:**
- Create: `lib/validations/auth.ts`
- Create: `lib/validations/profile.ts`
- Create: `lib/validations/auth.test.ts`
- Create: `lib/validations/profile.test.ts`

- [ ] **Step 1: Write failing auth validation tests**

Create `lib/validations/auth.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- lib/validations/auth.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement auth schemas**

Create `lib/validations/auth.ts`:
```typescript
import { z } from "zod";

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "กรุณากรอกชื่อ-นามสกุล (2–100 ตัวอักษร)")
    .max(100, "กรุณากรอกชื่อ-นามสกุล (2–100 ตัวอักษร)"),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z
    .string()
    .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
});

export const loginSchema = z.object({
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

/** Convert Zod errors to field-keyed Thai messages */
export function zodFieldErrors(
  error: z.ZodError,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
```

- [ ] **Step 4: Run auth tests**

Run: `npm run test -- lib/validations/auth.test.ts`
Expected: PASS

- [ ] **Step 5: Write and implement profile validation tests**

Create `lib/validations/profile.test.ts`:
```typescript
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
```

Create `lib/validations/profile.ts`:
```typescript
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
```

Run: `npm run test -- lib/validations/`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/validations/
git commit -m "feat: add Zod validation schemas for auth and profile"
```

---

### Task 5: Session Management (TDD)

**Files:**
- Create: `lib/auth/session.ts`
- Create: `lib/auth/session.test.ts`
- Create: `lib/auth/constants.ts`

- [ ] **Step 1: Write session constants**

Create `lib/auth/constants.ts`:
```typescript
export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
```

- [ ] **Step 2: Write failing session tests**

Create `lib/auth/session.test.ts`:
```typescript
import { eq } from "drizzle-orm";
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- lib/auth/session.test.ts`
Expected: FAIL — functions not exported

- [ ] **Step 4: Implement session management**

Create `lib/auth/session.ts`:
```typescript
import { randomBytes } from "crypto";
import { eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/db/schema";
import { sessions, users } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "./constants";

type Db = BetterSQLite3Database<typeof schema>;

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
```

- [ ] **Step 5: Run session tests**

Run: `npm run test -- lib/auth/session.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/auth/
git commit -m "feat: add session create, validate, and cookie helpers"
```

---

### Task 6: Auth Server Actions

**Files:**
- Create: `app/actions/auth.ts`

- [ ] **Step 1: Implement register, login, logout actions**

Create `app/actions/auth.ts`:
```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors (or only pre-existing ones)

- [ ] **Step 3: Commit**

```bash
git add app/actions/auth.ts
git commit -m "feat: add register, login, and logout server actions"
```

---

### Task 7: Profile Server Actions & Members Query

**Files:**
- Create: `app/actions/profile.ts`
- Create: `lib/members.ts`

- [ ] **Step 1: Implement profile actions**

Create `app/actions/profile.ts`:
```typescript
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
```

- [ ] **Step 2: Implement members query**

Create `lib/members.ts`:
```typescript
import { asc, count } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function getMemberCount(): Promise<number> {
  const rows = await getDb().select({ value: count() }).from(users);
  return rows[0]?.value ?? 0;
}

export async function getMembers() {
  return getDb()
    .select({
      fullName: users.fullName,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.createdAt));
}
```

- [ ] **Step 3: Commit**

```bash
git add app/actions/profile.ts lib/members.ts
git commit -m "feat: add profile actions and members query"
```

---

### Task 8: Shared UI Components

**Files:**
- Create: `app/components/form-field.tsx`
- Create: `app/components/navbar.tsx`
- Create: `app/components/submit-button.tsx`

- [ ] **Step 1: Create FormField component**

Create `app/components/form-field.tsx`:
```tsx
type FormFieldProps = {
  label: string;
  name: string;
  type?: string;
  error?: string;
  hint?: string;
  defaultValue?: string;
  readOnly?: boolean;
};

export function FormField({
  label,
  name,
  type = "text",
  error,
  hint,
  defaultValue,
  readOnly,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-zinc-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        readOnly={readOnly}
        className={`rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 ${
          readOnly ? "bg-zinc-100 text-zinc-500" : "bg-white"
        } ${error ? "border-red-500" : "border-zinc-300"}`}
      />
      {hint && !error && (
        <p className="text-xs text-zinc-500">{hint}</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Create SubmitButton**

Create `app/components/submit-button.tsx`:
```tsx
"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  label: string;
  pendingLabel?: string;
};

export function SubmitButton({
  label,
  pendingLabel = "กำลังดำเนินการ...",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
```

- [ ] **Step 3: Create Navbar**

Create `app/components/navbar.tsx`:
```tsx
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold text-zinc-900">
          ชมรม dev ยุค ai
        </Link>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/" className="text-zinc-600 hover:text-zinc-900">
            หน้าแรก
          </Link>
          <Link href="/members" className="text-zinc-600 hover:text-zinc-900">
            รายชื่อสมาชิก
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-zinc-600 hover:text-zinc-900"
              >
                แดชบอร์ด
              </Link>
              <Link
                href="/profile"
                className="text-zinc-600 hover:text-zinc-900"
              >
                โปรไฟล์
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-zinc-600 hover:text-zinc-900"
                >
                  ออกจากระบบ
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-zinc-600 hover:text-zinc-900">
                เข้าสู่ระบบ
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-zinc-900 px-3 py-1 text-white hover:bg-zinc-700"
              >
                สมัครสมาชิก
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/components/
git commit -m "feat: add shared FormField, SubmitButton, and Navbar components"
```

---

### Task 9: Layout & Auth Pages

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/(auth)/register/page.tsx`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/components/auth-form.tsx`

- [ ] **Step 1: Update root layout**

Modify `app/layout.tsx` metadata and add Navbar:
```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/app/components/navbar";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ชมรม dev ยุค ai",
  description: "ชุมชนนักพัฒนาที่เติบโตไปกับ AI",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
        <Navbar />
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create reusable auth form client component**

Create `app/components/auth-form.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";
import type { ActionState } from "@/app/actions/auth";

type Field = {
  name: string;
  label: string;
  type?: string;
  hint?: string;
};

type AuthFormProps = {
  title: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Field[];
  submitLabel: string;
  footer: React.ReactNode;
};

const initialState: ActionState = { success: false };

export function AuthForm({
  title,
  action,
  fields,
  submitLabel,
  footer,
}: AuthFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">{title}</h1>
      <form action={formAction} className="flex flex-col gap-4">
        {state.errors?._form && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.errors._form}
          </p>
        )}
        {fields.map((field) => (
          <FormField
            key={field.name}
            name={field.name}
            label={field.label}
            type={field.type}
            hint={field.hint}
            error={state.errors?.[field.name]}
          />
        ))}
        <SubmitButton label={submitLabel} />
      </form>
      <div className="mt-4 text-center text-sm text-zinc-600">{footer}</div>
    </div>
  );
}
```

- [ ] **Step 3: Create register page**

Create `app/(auth)/register/page.tsx`:
```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { register } from "@/app/actions/auth";
import { AuthForm } from "@/app/components/auth-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <AuthForm
      title="สมัครสมาชิก"
      action={register}
      fields={[
        { name: "fullName", label: "ชื่อ-นามสกุล" },
        { name: "email", label: "อีเมล", type: "email" },
        {
          name: "password",
          label: "รหัสผ่าน",
          type: "password",
          hint: "อย่างน้อย 8 ตัวอักษร",
        },
      ]}
      submitLabel="สมัครสมาชิก"
      footer={
        <>
          มีบัญชีแล้ว?{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline">
            เข้าสู่ระบบ
          </Link>
        </>
      }
    />
  );
}
```

- [ ] **Step 4: Create login page**

Create `app/(auth)/login/page.tsx`:
```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import { AuthForm } from "@/app/components/auth-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  const params = await searchParams;

  return (
    <div>
      {params.message && (
        <p className="mx-auto mt-4 max-w-md rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {params.message}
        </p>
      )}
      <AuthForm
        title="เข้าสู่ระบบ"
        action={login}
        fields={[
          { name: "email", label: "อีเมล", type: "email" },
          { name: "password", label: "รหัสผ่าน", type: "password" },
        ]}
        submitLabel="เข้าสู่ระบบ"
        footer={
          <>
            ยังไม่มีบัญชี?{" "}
            <Link href="/register" className="font-medium text-zinc-900 underline">
              สมัครสมาชิก
            </Link>
          </>
        }
      />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/components/auth-form.tsx app/\(auth\)/
git commit -m "feat: add login and register pages with Thai UI"
```

---

### Task 10: Protected Layout, Dashboard & Profile

**Files:**
- Create: `app/(protected)/layout.tsx`
- Create: `app/(protected)/dashboard/page.tsx`
- Create: `app/(protected)/profile/page.tsx`
- Create: `app/components/profile-forms.tsx`

- [ ] **Step 1: Create protected layout with session guard**

Create `app/(protected)/layout.tsx`:
```tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?message=" + encodeURIComponent("กรุณาเข้าสู่ระบบใหม่"));
  }
  return <>{children}</>;
}
```

- [ ] **Step 2: Create dashboard page**

Create `app/(protected)/dashboard/page.tsx`:
```tsx
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold">
        ยินดีต้อนรับ, {user?.fullName} 👋
      </h1>
      <p className="mt-2 text-zinc-600">ยินดีต้อนรับสู่ชมรม dev ยุค ai</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/profile"
          className="rounded-xl border border-zinc-200 bg-white p-6 hover:border-zinc-400"
        >
          <h2 className="font-medium">โปรไฟล์ของฉัน</h2>
          <p className="mt-1 text-sm text-zinc-500">แก้ไขชื่อและรหัสผ่าน</p>
        </Link>
        <Link
          href="/members"
          className="rounded-xl border border-zinc-200 bg-white p-6 hover:border-zinc-400"
        >
          <h2 className="font-medium">สมาชิกทั้งหมด</h2>
          <p className="mt-1 text-sm text-zinc-500">ดูรายชื่อสมาชิกชมรม</p>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create profile forms client component**

Create `app/components/profile-forms.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { updateProfile, changePassword } from "@/app/actions/profile";
import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";
import type { ActionState } from "@/app/actions/auth";

const initialState: ActionState = { success: false };

type ProfileFormsProps = {
  fullName: string;
  email: string;
};

export function ProfileForms({ fullName, email }: ProfileFormsProps) {
  const [profileState, profileAction] = useActionState(
    updateProfile,
    initialState,
  );
  const [passwordState, passwordAction] = useActionState(
    changePassword,
    initialState,
  );

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="mb-8 text-2xl font-semibold">โปรไฟล์ของฉัน</h1>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-medium">ข้อมูลส่วนตัว</h2>
        <form action={profileAction} className="flex flex-col gap-4">
          {profileState.success && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              บันทึกข้อมูลเรียบร้อยแล้ว
            </p>
          )}
          <FormField
            name="fullName"
            label="ชื่อ-นามสกุล"
            defaultValue={fullName}
            error={profileState.errors?.fullName}
          />
          <FormField name="email" label="อีเมล" defaultValue={email} readOnly />
          <SubmitButton label="บันทึก" pendingLabel="กำลังบันทึก..." />
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-medium">เปลี่ยนรหัสผ่าน</h2>
        <form action={passwordAction} className="flex flex-col gap-4">
          {passwordState.success && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              เปลี่ยนรหัสผ่านเรียบร้อยแล้ว
            </p>
          )}
          {passwordState.errors?._form && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {passwordState.errors._form}
            </p>
          )}
          <FormField
            name="currentPassword"
            label="รหัสผ่านเดิม"
            type="password"
            error={passwordState.errors?.currentPassword}
          />
          <FormField
            name="newPassword"
            label="รหัสผ่านใหม่"
            type="password"
            error={passwordState.errors?.newPassword}
          />
          <FormField
            name="confirmPassword"
            label="ยืนยันรหัสผ่าน"
            type="password"
            error={passwordState.errors?.confirmPassword}
          />
          <SubmitButton
            label="เปลี่ยนรหัสผ่าน"
            pendingLabel="กำลังเปลี่ยน..."
          />
        </form>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Create profile page**

Create `app/(protected)/profile/page.tsx`:
```tsx
import { getCurrentUser } from "@/lib/auth/session";
import { ProfileForms } from "@/app/components/profile-forms";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  return (
    <ProfileForms fullName={user!.fullName} email={user!.email} />
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/\(protected\)/ app/components/profile-forms.tsx
git commit -m "feat: add protected dashboard and profile pages"
```

---

### Task 11: Home & Members Pages

**Files:**
- Modify: `app/page.tsx`
- Create: `app/members/page.tsx`

- [ ] **Step 1: Rewrite home page**

Replace `app/page.tsx`:
```tsx
import Link from "next/link";
import { getMemberCount } from "@/lib/members";

export default async function Home() {
  const memberCount = await getMemberCount();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="text-4xl font-bold tracking-tight">ชมรม dev ยุค ai</h1>
      <p className="mt-4 text-lg text-zinc-600">
        ชุมชนนักพัฒนาที่เติบโตไปกับ AI
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/register"
          className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700"
        >
          สมัครสมาชิก
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium hover:bg-zinc-100"
        >
          เข้าสู่ระบบ
        </Link>
      </div>
      <p className="mt-10 text-sm text-zinc-500">
        สมาชิกทั้งหมด {memberCount} คน ·{" "}
        <Link href="/members" className="underline hover:text-zinc-900">
          ดูรายชื่อสมาชิก
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create members page**

Create `app/members/page.tsx`:
```tsx
import { getMemberCount, getMembers } from "@/lib/members";

export default async function MembersPage() {
  const [members, count] = await Promise.all([getMembers(), getMemberCount()]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold">สมาชิกชมรม dev ยุค ai</h1>
      <p className="mt-1 text-sm text-zinc-500">ทั้งหมด {count} คน</p>
      <ol className="mt-8 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
        {members.length === 0 ? (
          <li className="px-4 py-6 text-center text-zinc-500">
            ยังไม่มีสมาชิก
          </li>
        ) : (
          members.map((member, index) => (
            <li key={`${member.fullName}-${member.createdAt}`} className="px-4 py-3">
              {index + 1}. {member.fullName}
            </li>
          ))
        )}
      </ol>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx app/members/page.tsx
git commit -m "feat: add home page and public members directory"
```

---

### Task 12: Proxy (Next.js 16 Auth Guard)

**Files:**
- Create: `proxy.ts`

> **Note:** Next.js 16 เปลี่ยน `middleware.ts` → `proxy.ts`. Proxy ตรวจแค่การมี cookie (ไม่ query DB) — validation เต็มรูปแบบทำใน `(protected)/layout.tsx` แล้ว

- [ ] **Step 1: Create proxy**

Create `proxy.ts`:
```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

const protectedPaths = ["/dashboard", "/profile"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "message",
      encodeURIComponent("กรุณาเข้าสู่ระบบใหม่"),
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*"],
};
```

- [ ] **Step 2: Commit**

```bash
git add proxy.ts
git commit -m "feat: add proxy guard for protected routes"
```

---

### Task 13: Final Verification

**Files:** (none — verification only)

- [ ] **Step 1: Run all unit tests**

Run: `npm run test`
Expected: all tests PASS

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: build succeeds without errors

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`

Checklist:
1. เปิด `http://localhost:3000` — เห็นหน้าแรกภาษาไทย, สมาชิก 0 คน
2. สมัครสมาชิกที่ `/register` — redirect ไป `/dashboard`
3. ออกจากระบบ — กลับหน้าแรก
4. เข้าสู่ระบบที่ `/login` — redirect ไป `/dashboard`
5. แก้ชื่อที่ `/profile` — บันทึกสำเร็จ
6. เปลี่ยนรหัสผ่าน — สำเร็จ, login ด้วยรหัสใหม่ได้
7. เปิด `/members` โดยไม่ login — เห็นชื่อสมาชิก (ไม่มี email)
8. เปิด `/dashboard` โดยไม่ login — redirect ไป `/login`
9. สมัครด้วยอีเมลซ้ำ — แสดง "อีเมลนี้ถูกใช้งานแล้ว"
10. login ด้วยรหัสผิด — แสดง "อีเมลหรือรหัสผ่านไม่ถูกต้อง"

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 5: Final commit (if any fixes)**

```bash
git add -A
git commit -m "chore: verify membership system build and smoke tests"
```

---

## Spec Coverage Checklist

| Spec Requirement | Task |
|-----------------|------|
| FR-01 Register | Task 6, 9 |
| FR-02 Login | Task 6, 9 |
| FR-03 Logout | Task 6, 8 |
| FR-04 Dashboard | Task 10 |
| FR-05 Profile edit name | Task 7, 10 |
| FR-06 Change password | Task 7, 10 |
| FR-07 Public members list | Task 7, 11 |
| FR-08 Validation | Task 4 |
| FR-09 Thai UI | Task 8–11 |
| Session policy (30 days, HttpOnly) | Task 5 |
| SQLite local file | Task 2 |
| proxy.ts (Next.js 16) | Task 12 |

## Deviation from Spec

| Spec says | Plan does | Reason |
|-----------|-----------|--------|
| `middleware.ts` | `proxy.ts` | Next.js 16 deprecated middleware → proxy |
| DB validation in middleware | Cookie check in proxy + DB validation in layout | Next.js 16 proxy docs recommend not relying on shared modules/DB |
