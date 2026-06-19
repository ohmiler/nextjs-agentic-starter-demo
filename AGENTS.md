<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — ชมรม dev ยุค ai

Rules สำหรับ AI agents ที่ทำงานใน repo นี้

**อ่าน `CONTEXT.md` ก่อน** — มีบริบทโปรเจกต์, schema, routes, decisions log และ roadmap

---

## Project Summary

Membership web app สำหรับ **ชมรม dev ยุค ai**: register/login, profile, public member directory.

- **Stack:** Next.js 16 · React 19 · Turso (LibSQL) · Drizzle · custom session auth · Zod · Vitest · Tailwind 4
- **Deploy:** Vercel + Turso remote DB; local dev ใช้ `file:data/club.db`
- **UI:** ภาษาไทย · dark theme · accent cyan — ดู `app/globals.css`

---

## Before You Code

1. อ่าน `CONTEXT.md` และ spec ที่เกี่ยวข้องใน `docs/superpowers/specs/`
2. อ่าน Next.js guide ใน `node_modules/next/dist/docs/` สำหรับ API ที่จะใช้
3. ดูโค้ดรอบๆ ก่อนแก้ — match patterns ที่มีอยู่

---

## Architecture Rules

| หัวข้อ | กฎ |
|--------|-----|
| **Route guard** | ใช้ `proxy.ts` — **ไม่** สร้าง `middleware.ts` |
| **Proxy scope** | ตรวจ cookie เท่านั้น — ไม่ query DB ใน proxy |
| **Session validation** | `(protected)/layout.tsx` + `getCurrentUser()` |
| **Mutations** | Server Actions ใน `app/actions/` — ไม่สร้าง REST API แยก unless จำเป็น |
| **Database** | Drizzle ORM + `getDb()` — Turso/LibSQL via `@libsql/client` |
| **Auth** | Custom session (ไม่ใช้ Auth.js) — helpers ใน `lib/auth/` |
| **Validation** | Zod ใน `lib/validations/` — error messages **ภาษาไทย** |
| **Passwords** | bcrypt ผ่าน `lib/auth/password.ts` — ไม่เก็บ plain text |

---

## File Conventions

```
app/actions/       Server Actions (auth, profile, …)
app/components/    Shared UI components
app/(auth)/        Public auth pages
app/(protected)/   Login-required pages + layout guard
lib/db/            Schema + connection
lib/auth/          Session, password, constants
lib/validations/   Zod schemas + zodFieldErrors
lib/*.ts           Domain queries (e.g. members.ts)
proxy.ts           Route guard (root level)
```

- Path alias: `@/` → project root
- Client components: `"use client"` เฉพาะเมื่อจำเป็น (forms, hooks)
- หน้าใหม่ที่ต้อง login → ใส่ใน `app/(protected)/`

---

## Database Changes

1. แก้ `lib/db/schema.ts`
2. `npm run db:generate`
3. `npm run db:migrate` (remote ต้องมี `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`)
4. อัปเดต `createTestDb()` ใน `lib/db/index.ts` ถ้า schema เปลี่ยน

---

## UI Rules

- UI copy เป็นภาษาไทย (labels, errors, buttons)
- ใช้ design tokens / classes จาก `app/globals.css` (`.btn-primary`, `.input-field`, `.nav-link`, …)
- Landing/marketing → full-bleed hero, ไม่ card grid
- App surfaces (dashboard, profile, members) → Linear-style, divider lists ไม่ card mosaic
- อย่าเพิ่ม dependency UI library ใหม่ unless user ขอ

---

## Testing

- Logic ใน `lib/` → Vitest + TDD เมื่อเป็นไปได้
- Test file: `*.test.ts` คู่กับ source
- In-memory DB: `createTestDb()` จาก `lib/db/index.ts`
- ก่อนจบงาน: `npm run test` และ `npm run build` ต้อง pass

---

## Security

- ไม่ commit `.env.local`, `data/club.db`, secrets
- รายชื่อสมาชิก public แสดง **ชื่อ-นามสกุลเท่านั้น** — ไม่ leak email
- Login error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" — ไม่ระบุว่าอันไหนผิด
- Session cookie: HttpOnly, SameSite=Lax, 30 วัน

---

## Do NOT

- ใช้ `middleware.ts` (deprecated ใน Next.js 16 — ใช้ `proxy.ts`)
- ใส่ Auth.js / NextAuth unless user ขอเปลี่ยน architecture
- ใช้ `better-sqlite3` หรือ SQLite file บน Vercel (ใช้ Turso/LibSQL แทน)
- สร้าง feature นอก scope โดยไม่ brainstorm/spec ก่อน (ดู roadmap ใน `CONTEXT.md`)
- Over-engineer — YAGNI, minimal diff, match existing style

---

## Verification Checklist

```bash
npm run test      # unit tests
npm run build     # production build
npm run lint      # eslint
```

---

## Docs Map

| ไฟล์ | ใช้เมื่อ |
|------|---------|
| `CONTEXT.md` | บริบทโปรเจกต์, schema, routes, roadmap |
| `docs/superpowers/specs/` | design spec ของ feature |
| `docs/superpowers/plans/` | implementation plan |
| `node_modules/next/dist/docs/` | Next.js 16 API reference |

---

## New Features Workflow

ฟีเจอร์ใหม่ที่ใหญ่กว่า bugfix เล็กๆ:

1. Brainstorm + spec ใน `docs/superpowers/specs/`
2. Implementation plan ใน `docs/superpowers/plans/`
3. Implement ตาม plan
4. อัปเดต `CONTEXT.md` เมื่อ architecture หรือ scope เปลี่ยน
