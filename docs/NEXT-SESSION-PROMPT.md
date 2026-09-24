# Prompt เริ่มต้นสำหรับ session ใหม่ (คัดลอกไปวางได้เลย)

> วางข้อความด้านล่างนี้เป็นข้อความแรกใน session ใหม่ เพื่อให้ทำงานต่อจากจุดปัจจุบันได้ทันที

---

ผมทำงานต่อโปรเจกต์ **ISMS-Lite** (PWA จัดการเอกสาร ISO 27001 ของ บ.มโหฬาร) ที่คุณ (Claude) เขียนเอง

**บริบทสำคัญ — อ่านก่อนเริ่ม:**
- repo: `C:\Users\MyNB\Documents\Claude\ISMS-Lite` (branch `master`, git user.name=SV-mhl)
- โปรดอ่าน **`docs/PROJECT-STATUS.md`** (สถานะล่าสุด/สแตก/env/วิธี deploy) และ **`docs/DEFERRED-BACKLOG.md`** (งานที่เลื่อนไว้) เป็น source of truth ก่อนลงมือ
- Production LIVE แล้ว: https://isms-lite.vercel.app · GitHub `SV-mhl/ISMS-Lite` · DB = Neon (prod) / local Postgres `isms_lite_dev` (dev) · Drive = Shared Drive `ISMS Repository`
- ⚠️ นี่คือ track ที่ Claude **เขียนโค้ดเอง** แยกจากงาน audit-role (คนละ repo)

**วิธีทำงานที่ผมต้องการ (สำคัญ):**
1. **เช็ค impact + ทำข้อเสนอให้ผมยืนยัน/เลือกก่อนลงมือทุกครั้ง** (ทำทีละขั้น)
2. เวลาถามให้ใช้ตัวเลือกที่ระบุ "แนะนำ" + เหตุผล ยึดหลัก MVP
3. หลังแก้โค้ด: `npx tsc --noEmit` + `npm run test` + `npm run build` ให้ผ่านก่อน commit
4. commit + `git push origin master` → Vercel auto-redeploy · ถ้าแก้ schema ต้อง migrate ทั้ง dev + Neon prod
5. verify E2E จริง แล้วสรุปผลให้ผมทดสอบก่อนไป step ถัดไป

**สิ่งที่อยากทำใน session นี้:** _(ผมจะระบุ — เช่น "เปิด Resend อีเมลจริง" / "เริ่ม traceability ระดับกลาง: ผู้ตรวจสำรอง" / "ทำหน้า /settings/users จัดการ role" / อื่น ๆ จาก DEFERRED-BACKLOG)_

เริ่มด้วยการยืนยันว่าคุณอ่าน PROJECT-STATUS.md + DEFERRED-BACKLOG.md แล้ว สรุปสถานะปัจจุบันสั้น ๆ ให้ผมฟัง แล้วรอผมบอกงานที่จะทำครับ

---

## หมายเหตุสำหรับผู้ใช้
- Neon connection string เก็บในเครื่อง (`.env.local`, ไม่ commit) — session ใหม่ให้ใช้ค่านี้ตอน migrate/set-role prod
- ถ้าจะทดสอบ login prod ด้วยบัญชีใหม่ ต้อง login เว็บครั้งแรกก่อน แล้วจึง `set-role`
