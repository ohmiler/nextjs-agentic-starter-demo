# Design Spec: ระบบสมาชิกชมรม dev ยุค ai

**วันที่:** 2026-06-18  
**สถานะ:** Approved (brainstorming)  
**Tech stack:** Next.js 16 + SQLite (local/VPS)

---

## 1. เป้าหมาย

ระบบสมาชิกชมรม **dev ยุค ai** สำหรับ:

- สมัครสมาชิกและเข้าสู่ระบบ
- จัดการโปรไฟล์ส่วนตัว
- แสดงรายชื่อสมาชิกแบบ public

---

## 2. Functional Requirements

| ID | Requirement | รายละเอียด |
|----|-------------|------------|
| FR-01 | สมัครสมาชิก | กรอก ชื่อ-นามสกุล, อีเมล, รหัสผ่าน → สมัครเสร็จ login ได้ทันที |
| FR-02 | เข้าสู่ระบบ | login ด้วย อีเมล + รหัสผ่าน |
| FR-03 | ออกจากระบบ | logout ลบ session |
| FR-04 | หน้า Dashboard | หน้า protected แสดง "ยินดีต้อนรับ {ชื่อ}" — ต้อง login |
| FR-05 | โปรไฟล์ | ดู/แก้ไข ชื่อ-นามสกุล — ต้อง login |
| FR-06 | เปลี่ยนรหัสผ่าน | กรอกรหัสผ่านเดิม + รหัสผ่านใหม่ — ต้อง login |
| FR-07 | รายชื่อสมาชิก | หน้า public แสดง ชื่อ-นามสกุล ทุกคน เรียงตามวันที่สมัคร — **ไม่ต้อง login** |
| FR-08 | Validation | อีเมล unique, รูปแบบอีเมลถูกต้อง, รหัสผ่านขั้นต่ำ 8 ตัวอักษร |
| FR-09 | ภาษา UI | ภาษาไทยทั้งหมด (label, ปุ่ม, error message) |

### Out of Scope (v1)

- ลืมรหัสผ่าน / reset ทางอีเมล
- Admin panel / อนุมัติสมาชิก
- OAuth (Google, GitHub)
- Email verification
- Deploy บน Vercel/serverless
- Rate limiting

---

## 3. Technical Approach

**แนวทางที่เลือก:** Drizzle ORM + Custom Session (แนะนำจาก brainstorming)

| Layer | เลือกใช้ |
|-------|---------|
| Framework | Next.js 16 (App Router) |
| Database | SQLite file (`better-sqlite3`) บน local/VPS |
| ORM | Drizzle ORM |
| Validation | Zod |
| Password | bcrypt (cost factor 12) |
| Styling | Tailwind CSS 4 |
| Session | Custom — DB + HTTP-only cookie |

### แนวทางที่พิจารณาแล้วไม่เลือก

| แนวทาง | เหตุผลที่ไม่เลือก |
|--------|------------------|
| Auth.js (NextAuth) | overkill สำหรับ email/password เท่านั้น, config หนัก |
| Lucia Auth | ดี แต่ custom session อ่านง่ายกว่าสำหรับ learning project |

---

## 4. Data Model

### Schema (SQLite)

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

| ตาราง | หน้าที่ |
|-------|--------|
| `users` | ข้อมูลสมาชิก + password hash |
| `sessions` | session ที่ active (หนึ่ง user login ได้หลาย session) |

- `id` ของ user ใช้ UUID v4
- `id` ของ session ใช้ `crypto.randomBytes(32)` → hex string
- timestamp เก็บเป็น Unix milliseconds (INTEGER)
- ไม่เก็บรหัสผ่าน plain text

---

## 5. Routes & Access Control

| Route | ประเภท | ต้อง login? | หน้าที่ |
|-------|--------|------------|--------|
| `/` | Public | ไม่ | หน้าแรก — ลิงก์ไป login/register/members |
| `/register` | Public | ไม่* | ฟอร์มสมัครสมาชิก |
| `/login` | Public | ไม่* | ฟอร์มเข้าสู่ระบบ |
| `/dashboard` | Protected | ใช่ | ยินดีต้อนรับ + เมนู |
| `/profile` | Protected | ใช่ | แก้ชื่อ + เปลี่ยนรหัสผ่าน |
| `/members` | Public | ไม่ | รายชื่อสมาชิก (ชื่อ-นามสกุล) |

\* ถ้า login อยู่แล้ว redirect ไป `/dashboard`

---

## 6. Server Actions

| Action | Input | Output / Side effect |
|--------|-------|---------------------|
| `register` | fullName, email, password | สร้าง user + session → redirect `/dashboard` |
| `login` | email, password | สร้าง session → redirect `/dashboard` |
| `logout` | — | ลบ session → redirect `/` |
| `updateProfile` | fullName | อัปเดตชื่อ |
| `changePassword` | currentPassword, newPassword, confirmPassword | อัปเดต hash |
| `getMembers` | — | `{ fullName, createdAt }[]` เรียง `created_at ASC` |

Server Actions return `{ success: boolean, errors?: Record<string, string> }` สำหรับแสดง error บนฟอร์ม

---

## 7. Auth Flow & Session Policy

### Register / Login

1. Client ส่งข้อมูลผ่าน Server Action
2. Validate ด้วย Zod
3. Register: ตรวจ email ซ้ำ → bcrypt hash → INSERT user + session
4. Login: SELECT user by email → bcrypt compare → INSERT session
5. Set HTTP-only cookie → redirect `/dashboard`

### Protected Routes

1. Middleware อ่าน cookie `session`
2. SELECT session จาก DB ที่ `expires_at > now`
3. Valid → render หน้า / Invalid → redirect `/login`

### Session Policy

| รายการ | ค่า |
|--------|-----|
| Cookie name | `session` |
| HttpOnly | `true` |
| Secure | `true` (production), `false` (development) |
| SameSite | `Lax` |
| อายุ session | 30 วัน |
| Logout | ลบ row ใน `sessions` + ลบ cookie |

---

## 8. Security

| หัวข้อ | มาตรการ |
|--------|---------|
| Password storage | bcrypt (cost 12) |
| Session token | cryptographically random 32 bytes |
| CSRF | Next.js Server Actions built-in protection |
| SQL Injection | Drizzle ORM parameterized queries |
| Member directory | แสดงเฉพาะ `full_name` — ไม่เปิดเผย email |
| Login error message | "อีเมลหรือรหัสผ่านไม่ถูกต้อง" — ไม่ระบุว่าอันไหนผิด |

---

## 9. Validation Rules (Zod)

| ฟิลด์ | กฎ | Error message (ไทย) |
|-------|-----|---------------------|
| `fullName` | ไม่ว่าง, 2–100 ตัวอักษร | กรุณากรอกชื่อ-นามสกุล (2–100 ตัวอักษร) |
| `email` | รูปแบบอีเมลถูกต้อง | รูปแบบอีเมลไม่ถูกต้อง |
| `password` | อย่างน้อย 8 ตัวอักษร | รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร |
| `currentPassword` | ต้องตรงกับ hash ใน DB | รหัสผ่านเดิมไม่ถูกต้อง |
| `newPassword` | อย่างน้อย 8 ตัวอักษร, ต่างจากเดิม | รหัสผ่านใหม่ต้องแตกต่างจากเดิม |
| `confirmPassword` | ต้องตรงกับ `newPassword` | รหัสผ่านยืนยันไม่ตรงกัน |

---

## 10. Error Handling

| สถานการณ์ | พฤติกรรม |
|-----------|----------|
| อีเมลซ้ำตอนสมัคร | "อีเมลนี้ถูกใช้งานแล้ว" |
| อีเมล/รหัสผ่านผิดตอน login | "อีเมลหรือรหัสผ่านไม่ถูกต้อง" |
| Session หมดอายุ | redirect `/login` + "กรุณาเข้าสู่ระบบใหม่" |
| Validation fail | แสดง error ใต้ฟิลด์ที่ผิด |
| DB error | "เกิดข้อผิดพลาด กรุณาลองใหม่" + server log |

---

## 11. UI Pages

### Design หลัก

- โทนเรียบง่าย อ่านง่าย ภาษาไทยทั้งหมด
- Layout กลางจอ max-width ~480px (ฟอร์ม), ~768px (รายชื่อสมาชิก)
- Navbar ด้านบนทุกหน้า: ชื่อ **ชมรม dev ยุค ai** + เมนู

### Navbar

| สถานะ | เมนู |
|-------|------|
| ยังไม่ login | หน้าแรก · รายชื่อสมาชิก · เข้าสู่ระบบ · สมัครสมาชิก |
| login แล้ว | หน้าแรก · รายชื่อสมาชิก · แดชบอร์ด · โปรไฟล์ · ออกจากระบบ |

### หน้าแรก `/`

- Hero: ชื่อชมรม + tagline
- ปุ่ม สมัครสมาชิก / เข้าสู่ระบบ
- แสดงจำนวนสมาชิกทั้งหมด + ลิงก์ไป `/members`

### สมัครสมาชิก `/register`

- ฟิลด์: ชื่อ-นามสกุล, อีเมล, รหัสผ่าน
- ลิงก์ไป `/login`

### เข้าสู่ระบบ `/login`

- ฟิลด์: อีเมล, รหัสผ่าน
- ลิงก์ไป `/register`

### แดชบอร์ด `/dashboard` (protected)

- ข้อความต้อนรับพร้อมชื่อผู้ใช้
- การ์ดลิงก์ไป โปรไฟล์ / รายชื่อสมาชิก

### โปรไฟล์ `/profile` (protected)

- แก้ไขชื่อ-นามสกุล (อีเมล readonly)
- เปลี่ยนรหัสผ่าน: รหัสผ่านเดิม, ใหม่, ยืนยัน

### รายชื่อสมาชิก `/members` (public)

- แสดงชื่อ-นามสกุลทุกคน เรียงตามวันที่สมัคร (เก่า → ใหม่)
- แสดงจำนวนสมาชิกทั้งหมด
- ไม่แสดง email

---

## 12. File Structure

```
app/
  page.tsx
  register/page.tsx
  login/page.tsx
  dashboard/page.tsx
  profile/page.tsx
  members/page.tsx
  actions/
    auth.ts
    profile.ts
lib/
  db/
    schema.ts
    index.ts
  auth/
    session.ts
    password.ts
  validations/
    auth.ts
    profile.ts
middleware.ts
data/
  club.db          # gitignore
drizzle.config.ts
```

---

## 13. Environment & Deployment

| รายการ | ค่า |
|--------|-----|
| Deploy target | Local / VPS เท่านั้น |
| DB file path | `data/club.db` (configurable via env) |
| Env vars | `DATABASE_PATH`, `SESSION_SECRET` |
| `data/` | อยู่ใน `.gitignore` |

---

## 14. Decisions Log

| วันที่ | การตัดสินใจ | เหตุผล |
|--------|-------------|--------|
| 2026-06-18 | สมัครแล้วใช้ได้ทันที (ไม่รอ admin) | ลด complexity v1 |
| 2026-06-18 | เก็บแค่ ชื่อ, อีเมล, รหัสผ่าน | YAGNI |
| 2026-06-18 | ไม่มี forgot password | ไม่ต้อง setup email service |
| 2026-06-18 | SQLite file บน local/VPS | ตั้งง่าย เหมาะกับชมรม |
| 2026-06-18 | รายชื่อสมาชิก public (ชื่อเท่านั้น) | โปรโมทชมรมได้ ไม่ leak email |
| 2026-06-18 | UI ภาษาไทยทั้งหมด | กลุ่มเป้าหมายเป็นคนไทย |
| 2026-06-18 | Custom session แทน Auth.js | โค้ดอ่านง่าย เหมาะ learning |
