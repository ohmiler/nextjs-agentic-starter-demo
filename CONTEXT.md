# CONTEXT.md — ชมรม dev ยุค ai

เอกสารนี้อธิบายบริบทโปรเจกต์สำหรับนักพัฒนาและ AI agents ที่จะทำงานต่อใน repo นี้

---

## โปรเจกต์คืออะไร

**ระบบสมาชิกชมรม dev ยุค ai** — web app สำหรับสมัครสมาชิก, เข้าสู่ระบบ, จัดการโปรไฟล์ และแสดงรายชื่อสมาชิกแบบ public

- **Repo:** https://github.com/ohmiler/nextjs-agentic-starter-demo.git
- **เริ่มจาก:** Next.js 16 starter (`create-next-app`)
- **สถานะปัจจุบัน:** v1 ครบตาม spec — auth + profile + member directory + UI refresh

---

## Tech Stack

| Layer | เทคโนโลยี |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| Database | SQLite file (`better-sqlite3`) |
| ORM | Drizzle ORM |
| Auth | Custom session (DB + HTTP-only cookie) |
| Password | bcrypt (cost 12) |
| Validation | Zod |
| Tests | Vitest |
| Language | TypeScript |
| Deploy target | Local / VPS (ไม่ใช่ Vercel serverless) |

---

## สิ่งสำคัญเกี่ยวกับ Next.js 16

อ่าน guide ใน `node_modules/next/dist/docs/` ก่อนแก้โค้ด — API อาจต่างจาก Next.js รุ่นเก่า

- ใช้ **`proxy.ts`** แทน `middleware.ts` สำหรับ route guard
- `proxy.ts` ตรวจแค่การมี session cookie; validation เต็มรูปแบบทำใน `(protected)/layout.tsx` และ Server Actions
- อย่า query DB ใน `proxy.ts` โดยตรง (Next.js แนะนำไม่พึ่ง shared modules ใน proxy)

---

## ฟีเจอร์ v1 (มีแล้ว)

| ฟีเจอร์ | Route | ต้อง login? |
|---------|-------|-------------|
| หน้าแรก (landing) | `/` | ไม่ |
| สมัครสมาชิก | `/register` | ไม่ |
| เข้าสู่ระบบ | `/login` | ไม่ |
| แดชบอร์ด | `/dashboard` | ใช่ |
| โปรไฟล์ (แก้ชื่อ, เปลี่ยนรหัสผ่าน) | `/profile` | ใช่ |
| รายชื่อสมาชิก (public) | `/members` | ไม่ |
| ออกจากระบบ | Server Action | ใช่ |

### พฤติกรรมสำคัญ

- สมัครแล้ว **login ได้ทันที** — ไม่รอ admin อนุมัติ
- เก็บข้อมูล: **ชื่อ-นามสกุล, อีเมล, รหัสผ่าน**
- รายชื่อสมาชิก public แสดง **ชื่อ-นามสกุลเท่านั้น** — ไม่เปิด email
- UI **ภาษาไทยทั้งหมด**
- Session อายุ **30 วัน**, cookie ชื่อ `session`

### ยังไม่มี (out of scope v1)

- ลืมรหัสผ่าน / reset ทางอีเมล
- Admin panel
- OAuth (Google, GitHub)
- Email verification
- Rate limiting
- Events / กิจกรรม

---

## สถาปัตยกรรม Auth

```
Register/Login (Server Action)
  → validate (Zod)
  → bcrypt hash/compare
  → INSERT session ใน DB
  → set HTTP-only cookie
  → redirect /dashboard

Protected route
  → proxy.ts: มี cookie ไหม?
  → (protected)/layout.tsx: validateSession() กับ DB
  → render หรือ redirect /login
```

Session ID เก็บใน cookie; ข้อมูล session เก็บในตาราง `sessions`

---

## Database Schema

```sql
users (id, full_name, email UNIQUE, password_hash, created_at)
sessions (id, user_id → users.id CASCADE, expires_at)
```

- Drizzle schema: `lib/db/schema.ts`
- Connection: `lib/db/index.ts` — `getDb()` singleton, `createTestDb()` สำหรับ test (in-memory)
- Migration: `drizzle/` + `npm run db:generate` / `db:migrate`
- DB file: `data/club.db` (gitignored)

---

## โครงสร้างไฟล์หลัก

```
app/
  page.tsx                    # Landing (full-bleed hero)
  layout.tsx                  # Root layout + Navbar
  (auth)/login/, register/    # ฟอร์ม auth
  (protected)/                # dashboard, profile + session guard layout
  members/page.tsx            # รายชื่อสมาชิก public
  actions/auth.ts             # register, login, logout
  actions/profile.ts          # updateProfile, changePassword
  components/                 # navbar, auth-form, form-field, profile-forms, ...
lib/
  db/                         # schema, connection
  auth/                       # password, session, constants
  validations/                # Zod schemas (auth, profile)
  members.ts                  # getMembers, getMemberCount
proxy.ts                      # Next.js 16 route guard
docs/superpowers/
  specs/                      # design spec
  plans/                      # implementation plan
```

---

## Design / UI

- **Visual thesis:** Dark editorial tech — พื้น charcoal, accent cyan (`#22d3ee`)
- Design tokens และ utility classes อยู่ใน `app/globals.css`
- Landing page: full-bleed hero + mesh/grid (ไม่ใช้ card grid)
- App surfaces (dashboard, profile, members): Linear-style — divider lists, ไม่ใช้ card mosaic
- Font: Geist (sans + mono)

---

## Environment Variables

```env
DATABASE_PATH=./data/club.db
SESSION_SECRET=<random-hex-64-chars>
```

- Template: `.env.example`
- Local: `.env.local` (gitignored)

---

## Commands

```bash
npm run dev          # dev server → http://localhost:3000
npm run build        # production build
npm run test         # vitest (12 tests)
npm run db:generate  # สร้าง migration จาก schema
npm run db:migrate   # apply migration (ต้องมี data/ dir ก่อน)
npm run db:studio    # Drizzle Studio
```

---

## การตัดสินใจที่สำคัญ (Decisions Log)

| วันที่ | การตัดสินใจ | เหตุผล |
|--------|-------------|--------|
| 2026-06-18 | Custom session แทน Auth.js | โค้ดอ่านง่าย, เหมาะ learning project |
| 2026-06-18 | SQLite file บน local/VPS | ตั้งง่าย, เหมาะชมรมเล็ก |
| 2026-06-18 | สมัครแล้วใช้ได้ทันที | ลด complexity v1 |
| 2026-06-18 | รายชื่อสมาชิก public (ชื่อเท่านั้น) | โปรโมทชมรมได้, ไม่ leak email |
| 2026-06-18 | `proxy.ts` แทน `middleware.ts` | Next.js 16 convention |

---

## Roadmap ที่พิจารณาแล้ว (ยังไม่ implement)

ลำดับที่แนะนำจาก brainstorming:

1. **v2.0** — Events + โปรไฟล์ขยาย (GitHub, bio, avatar)
2. **v2.1** — Admin พื้นฐาน + หน้า `/members/[id]`
3. **v2.2** — GitHub OAuth + ลืมรหัสผ่าน
4. **v3.0** — Project showcase / Resource hub

---

## เอกสารอ้างอิง

- Design spec: `docs/superpowers/specs/2026-06-18-dev-yuk-ai-membership-design.md`
- Implementation plan: `docs/superpowers/plans/2026-06-18-dev-yuk-ai-membership.md`
- Agent rules: `AGENTS.md`, `CLAUDE.md`

---

## คำแนะนำสำหรับ agent ที่ทำงานต่อ

1. อ่าน `AGENTS.md` และ Next.js docs ใน `node_modules/next/dist/docs/` ก่อนเขียนโค้ด
2. ใช้ Server Actions เป็นหลัก — ไม่สร้าง REST API แยก unless จำเป็น
3. Validation ด้วย Zod + error message ภาษาไทย
4. ทดสอบด้วย Vitest สำหรับ logic ใน `lib/` (TDD preferred)
5. อย่า commit `.env.local` หรือ `data/club.db`
6. UI ใหม่ควรสอดคล้อง design system ใน `globals.css` (dark + cyan accent)
