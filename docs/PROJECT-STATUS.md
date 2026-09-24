# PROJECT STATUS — ISMS-Lite (handoff snapshot)

อัปเดต: 2026-09-24 · commit `a8bb832` · **สถานะ: MVP 1.0 LIVE PRODUCTION**

## ที่อยู่
- **Production:** https://isms-lite.vercel.app
- **Repo:** GitHub `SV-mhl/ISMS-Lite` (private) · local `C:\Users\MyNB\Documents\Claude\ISMS-Lite` · branch `master`
- **DB prod:** Neon (Singapore, pooled) · **DB dev:** local Postgres `isms_lite_dev`
- **Drive:** Shared Drive `ISMS Repository` (id `0AInNTy32BXf6Uk9PVA`) · storage identity = OAuth token ของ `surachot.vi@maholan.co.th`

## Stack
Next.js 16 (App Router, Turbopack) · React 19 · TS · Tailwind v4 · Drizzle + postgres-js ·
Auth.js v5 (Google, `trustHost`) · googleapis (Drive) · pdf-lib (ลายน้ำ) · Vitest · PWA

## สิ่งที่ทำเสร็จ (อยู่บน prod)
- Auth Google `@maholan.co.th` · RBAC **3 roles**: `admin` / `isms_manager` / `member`
- เช็คอินเอกสาร→Drive · workflow Draft→Review→Approved→Published (+reject) · Task Inbox
- **Version control**: check-out/check-in เวอร์ชัน 1.x/2.x + effective copy คู่ขนาน
- ดาวน์โหลด **PDF-only + ลายน้ำ** (effective/working) · **ลบเอกสารร่าง** (trash Drive)
- แจ้งเตือน in-app 🔔 + email (Resend — โค้ดพร้อม ยังไม่เปิด)
- **ปฏิทิน ISO** (Action Plan) + reminder ล่วงหน้า (Vercel Cron รายวัน) + **Import PDF** (stub) + year selector
- Dashboard + Timeline (event_log) · landing เฉดการ์ด/Output เขียวตามสถานะ
- **`/settings/assignees`** (admin/manager): ตั้งผู้ตรวจ/อนุมัติเริ่มต้น ราย/ทุกกระบวนการ +
  **governance**: audit log · coverage (X/18) · segregation of duties · Dashboard tiles
- คุณภาพ: **12 unit tests** (`npm run test`) · tsc + build สะอาด

## ผู้ใช้ปัจจุบัน (prod)
- `surachot.vi@maholan.co.th` = **admin**
- `sornkanok.ch@maholan.co.th` = **isms_manager** + ตั้งเป็นผู้ตรวจเริ่มต้นครบ 18/18

## Env (Vercel Production) — ตั้งครบแล้ว
`DATABASE_URL`(Neon pooled) · `AUTH_SECRET` · `AUTH_URL`=https://isms-lite.vercel.app ·
`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` · `ALLOWED_EMAIL_DOMAIN`=maholan.co.th ·
`STORAGE_ACCOUNT_EMAIL`=surachot.vi@maholan.co.th · `ISMS_SHARED_DRIVE_ID` · `CRON_SECRET`
(ยังไม่ตั้ง: `RESEND_API_KEY`/`EMAIL_FROM` = อีเมลจริง)

## วิธีทำงานต่อ (workflow มาตรฐาน)
1. dev: `npm run dev -- -p 3000` (ต้องพอร์ต 3000 ให้ตรง redirect URI)
2. แก้โค้ด → `npx tsc --noEmit` + `npm run test` + `npm run build`
3. commit (git user.name=SV-mhl) → `git push origin master` → **Vercel auto-redeploy**
4. **ถ้าแก้ schema:** `npm run db:generate` → migrate dev → migrate Neon:
   `DATABASE_URL="<neon>" npm run db:migrate`
5. ตั้ง role: `DATABASE_URL="<neon>" npm run set-role -- <email> <admin|isms_manager|member>` (ผู้ใช้ต้อง login prod ก่อน)

> Neon connection string อยู่ในเครื่อง user (ไม่ commit) · migration ล่าสุด `0006` (event_log.entity_id nullable)

## งานที่เลื่อนไว้
ดู **[docs/DEFERRED-BACKLOG.md](DEFERRED-BACKLOG.md)** — traceability (กลาง/ใหญ่/graph) · Resend · SA key · real PDF parse · custom domain · `/settings/users` · QW4 · full RLS

## เอกสารอ้างอิง
`README.md` · `docs/STEP2-GOOGLE-OAUTH-SETUP` · `STEP3-DRIVE-SETUP` · `STEP5-EMAIL-SETUP` ·
`STEP9-DEPLOY` · `FEATURE-A-VERSION-CONTROL` · `FEATURE-B-ACTION-CALENDAR` ·
`FEATURE-RBAC-ISMS-MANAGER` · `LANDING-STATUS-INDICATORS` · `UAT-CHECKLIST` · `DEFERRED-BACKLOG`
