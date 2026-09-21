# Feature B — ปฏิทินงาน ISO (Action Plan) + แจ้งเตือนล่วงหน้า

โมดูลปฏิทินกำหนดการปฏิบัติงาน ISO ตาม KPI/QP ในวงรอบต่าง ๆ พร้อมแจ้งเตือนล่วงหน้า
อัตโนมัติ (in-app + email) ก่อนถึงวันครบกำหนด

## โครงสร้าง
- `action_items` — งานตามแผน: หัวข้อ · ผู้รับผิดชอบ · QP-ref · หมวด · **วงรอบ** (รายเดือน/ไตรมาส/6 เดือน/รายปี/ครั้งเดียว) · **lead_days** (วันแจ้งล่วงหน้า, admin ปรับได้) · `notify_user_id` (ถ้าไม่ตั้ง = แจ้ง admin ทุกคน)
- `action_occurrences` — งวดที่ต้องทำจริง: วันครบกำหนด · สถานะ (pending/done) · `reminded_at` (กันแจ้งซ้ำ)

## Seed
`npm run db:seed-calendar` — นำเข้า 31 รายการจาก Action Plan (FY2026: ต.ค.25–ก.ย.26) + สร้าง occurrences ตามวงรอบ (94 งวด). idempotent ต่อปี (ลบปีเดิมแล้วใส่ใหม่).

## Reminder engine
`lib/reminders.ts` → `runReminders(now)`:
- หา occurrence ที่ `pending` และยังไม่เคยแจ้ง (`reminded_at` null)
- ถ้า `now ≥ dueDate − leadDays` → แจ้งเตือนผู้รับ (notify_user_id หรือ admin ทุกคน) ทั้ง in-app + email → ตั้ง `reminded_at`
- แจ้ง **ครั้งเดียวต่องวด** (idempotent)

## Cron
- Endpoint `POST/GET /api/cron/reminders` — auth ด้วย `Authorization: Bearer $CRON_SECRET` (Vercel Cron) **หรือ** admin ที่ล็อกอิน (ปุ่ม "ส่งแจ้งเตือนตอนนี้")
- `vercel.json` ตั้ง cron รายวัน 01:00 UTC (~08:00 ไทย)
- Vercel จะส่ง `CRON_SECRET` เป็น Bearer ให้อัตโนมัติเมื่อมี env `CRON_SECRET`

## UI — `/calendar` (ทุกคนดูได้)
- ตารางงาน + งวดกำหนดการ (สีเขียว=เสร็จ · แดง=เลยกำหนด · ส้ม=ใกล้ถึง ≤14 วัน · ฟ้า=อนาคต)
- **admin**: ปรับ `lead_days` ต่อรายการ (ต่อปี), กดสลับสถานะเสร็จ/ค้างของแต่ละงวด, ปุ่ม "ส่งแจ้งเตือนตอนนี้"

## ปรับสำหรับปีต่อไป
รันซ้ำ `db:seed-calendar` (เปลี่ยน `YEAR`/`FY_START_YEAR` ในสคริปต์) หรือเพิ่มรายการผ่าน DB · lead_days ปรับได้ที่หน้า `/calendar` โดย admin
