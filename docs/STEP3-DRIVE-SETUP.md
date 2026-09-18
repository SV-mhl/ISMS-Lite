# Step 3 — ตั้งค่า Google Drive (OAuth storage identity + Shared Drive)

ให้ backend เก็บ "ต้นฉบับ" ไว้ที่ Shared Drive กลางที่ระบบคุมเอง — สมาชิกไม่ได้สิทธิ์ Drive ตรง
(นี่คือสิ่งที่ทำให้กติกา "เผยแพร่แล้วโหลดได้แค่ PDF" บังคับได้จริงใน Step 6)

> ⚠️ **หมายเหตุสำคัญ:** org policy ของมโหฬาร (`iam.managed.disableServiceAccountKeyCreation`)
> บล็อกการสร้าง Service Account key → เราจึงใช้ **OAuth token ของบัญชี storage** (บัญชีที่ login
> เข้าแอปและเป็น Content Manager ของ Shared Drive) เป็นตัวตนที่ backend ใช้คุย Drive แทน
> ผลลัพธ์เหมือนกัน (PDF-only บังคับได้) · *Deferred: ย้ายไป Service Account เมื่อ policy อนุญาต (Post-MVP1.0)*

---

## 1) สร้าง Shared Drive
1. เข้า https://drive.google.com/ → เมนูซ้าย **ไดรฟ์ที่แชร์ (Shared drives)** → **ใหม่**
2. ตั้งชื่อ **`ISMS Repository`** → สร้าง
3. คัดลอก **Shared Drive ID** จาก URL: `https://drive.google.com/drive/folders/< นี่คือ ID >`

> ⚠️ **อย่า** เพิ่มพนักงานทั่วไปเป็นสมาชิก Shared Drive นี้ — ให้ทุกคนเข้าถึงเอกสารผ่านแอปเท่านั้น

## 2) กำหนดบัญชี storage เป็นสมาชิก Shared Drive
บัญชี storage = บัญชีที่ backend ใช้คุย Drive (ค่าเริ่มต้น = `surachot.vi@maholan.co.th`)
1. บัญชีนี้ต้อง **login เข้าแอปแล้วอย่างน้อย 1 ครั้ง** (เพื่อให้ระบบมี Drive token) — ✅ ทำแล้ว
2. บัญชีนี้ต้องเป็น **Content Manager / Manager ของ Shared Drive** `ISMS Repository`
   - ผู้สร้าง Shared Drive เป็น Manager อยู่แล้วโดยอัตโนมัติ ✅

> ถ้าจะเปลี่ยนบัญชี storage ในภายหลัง → แก้ `STORAGE_ACCOUNT_EMAIL` ใน `.env.local`
> (บัญชีใหม่ต้อง login เข้าแอป + เป็นสมาชิก Shared Drive ด้วย)

## 3) ใส่ค่าลงโปรเจกต์
`.env.local`:
```
STORAGE_ACCOUNT_EMAIL=surachot.vi@maholan.co.th
ISMS_SHARED_DRIVE_ID=<Shared Drive ID จากข้อ 1>
```
(ไม่ต้องมี Service Account key แล้ว)

## 5) สร้างโฟลเดอร์ 18 กระบวนการ
1. `npm run dev` → login เป็น **admin** (โปรโมทด้วย `npm run promote-admin -- you@maholan.co.th`)
2. บนแถบบนสุดจะมีปุ่ม **⚙︎ ตั้งค่าโฟลเดอร์ Drive** → คลิก 1 ครั้ง
3. ระบบจะสร้างโฟลเดอร์ `Y01 …` ถึง `Y17 …` ใน Shared Drive อัตโนมัติ

## 6) ทดสอบเช็คอิน
เข้าหน้ากระบวนการใด ๆ (เช่น `/process/y07`) → กรอกชื่อเอกสาร + แนบไฟล์ → **⬆️ เช็คอิน**
- ไฟล์จะขึ้นไปอยู่ในโฟลเดอร์ของกระบวนการนั้นใน Shared Drive
- เอกสารปรากฏในตารางสถานะ **ร่าง** + บันทึกลง event log
- "อัปเวอร์ชันใหม่" = เพิ่ม v2, v3… (ตัวเก่าเก็บไว้ครบ)

---

### หมายเหตุ
- ต้นฉบับถูกสร้างใน Shared Drive → เป็นของ **องค์กร** (ไม่หายเมื่อคนออก) แม้ตัวตนที่สั่งงานจะเป็น OAuth ของ storage user
- ถ้า storage user เพิกถอนสิทธิ์/ออกจากองค์กร → เปลี่ยน `STORAGE_ACCOUNT_EMAIL` เป็นบัญชีอื่น (ต้อง login + เป็นสมาชิก Shared Drive)
- ขนาดไฟล์สูงสุดต่อการอัปโหลด 25 MB (ปรับได้ภายหลัง)
- **Post-MVP1.0:** เมื่อ org policy อนุญาต ให้ย้ายไปใช้ Service Account (ตัวตนกลาง ไม่ผูกคน) — โค้ดเผื่อไว้แล้ว
