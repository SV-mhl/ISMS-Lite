# Step 9 — Deploy Runbook (GitHub SV-mhl → Vercel + Neon)

Deploy ISMS-Lite ขึ้น production · ไฟล์เอกสาร/ต้นฉบับยังอยู่บน Google Drive เดิม (Shared Drive
`ISMS Repository`) · ฐานข้อมูลย้ายจาก local → **Neon** · โฮสต์บน **Vercel**

---

## ภาพรวมลำดับ
1. Push โค้ดขึ้น **GitHub (บัญชี SV-mhl)** — repo **private**
2. สร้าง **Neon** (Postgres prod) → รัน migration + seed
3. Import repo เข้า **Vercel** → ตั้ง **Environment Variables**
4. เพิ่ม **redirect URI production** ใน Google OAuth
5. Deploy → **surachot login 1 ครั้ง** (สร้าง Drive token ใน prod DB) → promote admin → ตั้งโฟลเดอร์
6. ตรวจ **Vercel Cron** (reminder รายวัน)

---

## 1) GitHub (SV-mhl)
```bash
# ในเครื่อง (โฟลเดอร์โปรเจกต์)
git remote add origin https://github.com/SV-mhl/isms-lite.git
git push -u origin master
```
> สร้าง repo **private** ชื่อ `isms-lite` ใต้บัญชี SV-mhl ก่อน (github.com → New repository → Private → ไม่ต้องใส่ README)

## 2) Neon (Postgres prod) — SKELETON เท่านั้น
> Skeleton = schema + ข้อมูลอ้างอิง (18 processes) เท่านั้น · **ไม่มี** users/documents/versions/
> tasks/events/notifications/tokens · **ไม่ก๊อปข้อมูลจาก dev** · ปฏิทิน **เว้นว่าง** (admin Import เองภายหลัง)

1. https://neon.tech → New Project (region ใกล้ไทย เช่น Singapore)
2. คัดลอก **Pooled connection string** (มี `-pooler`) → `DATABASE_URL`
3. รัน migration + seed (เฉพาะ 18 processes) จากเครื่อง (ชี้ไป Neon ชั่วคราว):
   ```bash
   DATABASE_URL="<neon-pooled-url>" npm run db:migrate
   DATABASE_URL="<neon-pooled-url>" npm run db:seed
   # ไม่ต้องรัน db:seed-calendar — ปล่อยปฏิทินว่าง ให้ admin กด "⬆️ Import ปฏิทิน" ในหน้า /calendar เอง
   ```
   ตรวจว่าโล่งจริง: `documents`, `users`, `action_items` = 0 แถว · `processes` = 18 · driveFolderId = NULL

## 3) Vercel
1. https://vercel.com → Add New → Project → Import จาก GitHub `SV-mhl/isms-lite`
2. Framework = Next.js (auto) → ยังไม่ต้อง deploy จนกว่าจะตั้ง env
3. **Environment Variables** (Production):
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Neon pooled URL |
   | `AUTH_SECRET` | สุ่มใหม่: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
   | `AUTH_URL` | `https://<vercel-domain>` (แก้เป็นโดเมนจริงหลัง deploy ครั้งแรก) |
   | `AUTH_GOOGLE_ID` | (เดิมจาก dev) |
   | `AUTH_GOOGLE_SECRET` | (เดิมจาก dev) |
   | `ALLOWED_EMAIL_DOMAIN` | `maholan.co.th` |
   | `STORAGE_ACCOUNT_EMAIL` | `surachot.vi@maholan.co.th` |
   | `ISMS_SHARED_DRIVE_ID` | `0AInNTy32BXf6Uk9PVA` |
   | `CRON_SECRET` | สุ่มใหม่: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"` |
   | `RESEND_API_KEY` | (ถ้าจะเปิดอีเมล) |
   | `EMAIL_FROM` | `ISMS-Lite <no-reply@maholan.co.th>` (ถ้าเปิดอีเมล) |
4. Deploy → ได้โดเมน เช่น `https://isms-lite.vercel.app`
5. กลับไปแก้ `AUTH_URL` = โดเมนจริง → Redeploy

## 4) Google OAuth (production redirect)
GCP Console → Credentials → OAuth client `ISMS-Lite-PWA` → **Authorized redirect URIs** → Add:
```
https://<vercel-domain>/api/auth/callback/google
```
(consent screen เป็น Internal อยู่แล้ว — ไม่ต้อง verify)

## 5) Bootstrap prod
1. เปิดโดเมนจริง → **surachot login ด้วย Google** (สร้าง user + Drive token ใน Neon)
2. promote admin (ชี้ DATABASE_URL ไป Neon):
   ```bash
   DATABASE_URL="<neon-pooled-url>" npm run promote-admin -- surachot.vi@maholan.co.th
   ```
3. refresh → เห็น ADMIN → หน้ากระบวนการ (workspace) กด **⚙︎ ตั้งค่าโฟลเดอร์ Drive** 1 ครั้ง
   - โฟลเดอร์ Y01–Y17 มีอยู่แล้วใน Shared Drive → ระบบจะ **reuse** (ไม่สร้างซ้ำ)

## 6) Vercel Cron
- `vercel.json` มี cron `/api/cron/reminders` รายวัน 01:00 UTC อยู่แล้ว → Vercel เปิดให้อัตโนมัติ
- Vercel ส่ง `Authorization: Bearer $CRON_SECRET` ให้เอง (เพราะตั้ง env `CRON_SECRET`)

---

## หมายเหตุสำคัญ
- **Drive token ต้องมีใน prod DB**: ถ้ายังไม่ login prod ด้วย `STORAGE_ACCOUNT_EMAIL` → เช็คอิน/ดาวน์โหลดจะขึ้น error (503) จนกว่าจะ login
- **ห้าม** ตั้ง `ALLOW_DEV_LOGIN` หรือ dev-login ใด ๆ บน production (ไม่มีในโค้ดชุดนี้)
- Neon ใช้ **pooled URL** + โค้ดตั้ง `prepare:false` แล้ว (เข้ากับ pgbouncer)
- Rollback: Vercel → Deployments → Promote ตัวก่อนหน้า · DB migration เดินหน้าอย่างเดียว (สำรอง Neon branch ก่อนแก้)
