# ISMS-Lite · ศูนย์จัดการเอกสาร ISO/IEC 27001:2022 (มโหฬาร)

PWA แบบ Lite สำหรับจัดการ **เอกสารและกระบวนการเตรียมความพร้อม ISO 27001** —
แนวคิดคล้าย SharePoint เบา ๆ: เช็คอินเอกสารขึ้น **Google Drive**, เดิน **workflow ตรวจ → อนุมัติ**,
และ **บันทึกเหตุการณ์ทุกขั้นตอน** ลงฐานข้อมูล

## แนวคิดผลิตภัณฑ์

Landing page = แผนที่ **18 กระบวนการ (Y01–Y20)** ตาม Year-One Journey → คลิกเข้าแต่ละกระบวนการ →
เห็นรายการเอกสาร + สถานะ → **อัปโหลด (check-in) ขึ้น Google Drive** → ระบบ **แจ้งเตือน reviewer → approver** →
ทุกการกระทำถูกบันทึกเป็น **event log** (ใคร ทำอะไร เมื่อไร เวอร์ชันไหน)

## Decisions ที่ตกลงแล้ว

| หัวข้อ | สรุป |
|---|---|
| Stack | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Drizzle + Neon (Step 1) · Auth.js Google (Step 2) · Resend (Step 5) · PWA |
| Identity | Google OAuth เฉพาะ `@maholan.co.th` (ไม่มีรหัสผ่านแยก) |
| Workflow | Draft → Review → Approved → Published (+ reject loop + version/supersede) |
| Published | ผู้มีสิทธิ์ดาวน์โหลดเป็น **PDF เท่านั้น** (hybrid backend-mediated + watermark) |
| แจ้งเตือน | In-app inbox + Email (Resend) |
| Assignee | Default ต่อ process + แก้ต่อไฟล์ได้ |
| ISO mapping | ผูกกับ 18 process (defer Clause/Annex → post-MVP) |
| Deploy | Single-tenant มโหฬาร · Vercel |

## แผนพัฒนา (ทำทีละ Step · ยืนยันก่อนทุก Step)

- [x] **Step 0** — Scaffold + Landing page (18 process) + PWA skeleton
- [ ] Step 1 — DB schema + seed 18 process
- [ ] Step 2 — Auth Google OAuth `@maholan.co.th` + RBAC
- [ ] Step 3 — Google Drive integration (Shared Drive + check-in + versioning + export PDF)
- [ ] Step 4 — Workflow engine + Task Inbox
- [ ] Step 5 — Notifications (in-app + Resend email)
- [ ] Step 6 — Published PDF-only download
- [ ] Step 7 — Dashboard + event log timeline
- [ ] Step 8 — PWA polish + tests + UAT
- [ ] Step 9 — Deploy (Vercel + OAuth verify)

## รันในเครื่อง

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

## โครงสร้าง

```
app/
  layout.tsx            # ฟอนต์ไทย (IBM Plex Sans Thai) + metadata + PWA
  page.tsx              # Landing map (18 process)
  manifest.ts           # PWA manifest (→ /manifest.webmanifest)
  login/page.tsx        # placeholder (auth จริงใน Step 2)
  process/[id]/page.tsx # หน้ารายกระบวนการ (workspace เพิ่มใน Step ถัดไป)
lib/
  blueprint.ts          # ข้อมูล 18 process + platform (single source of truth)
```
