# Deferred Backlog — ISMS-Lite (Post-MVP 1.0)

รายการฟีเจอร์ที่เคยเสนอ/ตกลง **เลื่อนไว้ทำภายหลัง** (ไม่อยู่ใน MVP 1.0 ที่ deploy แล้ว)
อัปเดตล่าสุด: 2026-09-23

---

## ที่ผู้ใช้ขอบันทึก defer (23 ก.ย. 2026)

### 1. Traceability — ระดับกลาง (ต่อยอด governance)
ต่อยอดจากหน้า `/settings/assignees` (node "Task & Owner"):
- **ผู้ตรวจ/ผู้อนุมัติสำรอง (backup / delegate)** — ปัจจุบันได้คนเดียวต่อบทบาท · ISO มักต้องมีตัวสำรองเวลาคนหลักไม่ว่าง
- **Process Owner (RACI-lite)** — เพิ่มช่อง "เจ้าของกระบวนการ" นอกเหนือจากผู้ตรวจ/อนุมัติ
- **แจ้งเตือนเมื่อถูกตั้งเป็น default** — ผู้ถูกกำหนดรู้ตัวว่าได้รับมอบหมาย (in-app/email)

### 2. Traceability — ใหญ่ / Post-MVP (เต็มรูปตาม blueprint)
โมดูล traceability เต็ม ตามห่วงโซ่ blueprint:
`Context/Obligation → Scope → Process/Asset → Risk → Treatment → Control/SoA → Policy → Task&Owner → Evidence → Control Test/Audit → Finding → CAPA → Management Review → Stage 1/2`
- ต้องมี module **Risk / SoA / Control / Evidence** ก่อน (ยังไม่มีใน MVP)
- **ผูกเอกสารถึง Clause 4–10 / Annex A 93 controls** (MVP ผูกแค่ 18 process — defer clause/annex mapping)

### 3. Resend (อีเมลจริง)
- เปิดอีเมลแจ้งเตือน (ปัจจุบัน in-app ทำงาน · email เป็น graceful no-op)
- ตั้ง env บน Vercel: `RESEND_API_KEY` + `EMAIL_FROM` · ยืนยันโดเมน maholan.co.th ที่ Resend
- โค้ดพร้อมแล้ว (`lib/email.ts`) — แค่ใส่ key · ดู `docs/STEP5-EMAIL-SETUP.md`

### 4. Traceability graph เต็ม (visualization)
- หน้าแสดงกราฟความเชื่อมโยง + **Forward/Backward trace · Trace view 3 คลิก · Impact analysis · Orphan detection** (Control ไม่มี Risk / Risk ไม่มี Treatment / Control ไม่มี Evidence)
- เป็นส่วน UI ของข้อ 2 (ต้องมีข้อมูล Risk/Control/Evidence ก่อน)

---

## อื่น ๆ ที่ defer ไว้ก่อนหน้า (บันทึกรวมไว้)
- **Service Account key** สำหรับ Drive — เปลี่ยนจาก OAuth token ของ storage user เป็น SA (ตัวตนกลาง ไม่ผูกคน) เมื่อ org policy `iam.managed.disableServiceAccountKeyCreation` อนุญาต
- **Real PDF parsing** สำหรับ Import ปฏิทิน — ปัจจุบันเป็น stub (สร้างจาก template ตามปีที่เลือก) · ยังไม่แกะเนื้อหา PDF จริง
- **Custom domain** บริษัท แทน `*.vercel.app` (ต้องอัปเดต `AUTH_URL` + Google redirect URI)
- **หน้า `/settings/users`** — จัดการ role ผู้ใช้ผ่าน UI (ปัจจุบันใช้ `set-role` CLI)
- **QW4** (เมนู `/settings/assignees`) — ปุ่ม "ล้างทั้งหมด" (เคยเสนอ แต่เลือกทำ QW1–3 ก่อน)
- **Full RLS / multi-tenant** — MVP เป็น single-tenant มโหฬาร
