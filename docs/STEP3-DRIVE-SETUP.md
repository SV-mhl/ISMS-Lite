# Step 3 — ตั้งค่า Google Drive (Service Account + Shared Drive)

ให้ backend เก็บ "ต้นฉบับ" ไว้ที่ Shared Drive กลางที่ระบบคุมเอง — สมาชิกไม่ได้สิทธิ์ Drive ตรง
(นี่คือสิ่งที่ทำให้กติกา "เผยแพร่แล้วโหลดได้แค่ PDF" บังคับได้จริงใน Step 6)

> ต้องมี Google Workspace ของมโหฬาร และทำต่อจากโปรเจกต์ GCP เดียวกับ Step 2

---

## 1) สร้าง Shared Drive
1. เข้า https://drive.google.com/ → เมนูซ้าย **ไดรฟ์ที่แชร์ (Shared drives)** → **ใหม่**
2. ตั้งชื่อ **`ISMS Repository`** → สร้าง
3. คัดลอก **Shared Drive ID** จาก URL: `https://drive.google.com/drive/folders/< นี่คือ ID >`

> ⚠️ **อย่า** เพิ่มพนักงานทั่วไปเป็นสมาชิก Shared Drive นี้ — ให้ทุกคนเข้าถึงเอกสารผ่านแอปเท่านั้น

## 2) สร้าง Service Account
1. GCP Console → **IAM & Admin → Service Accounts → Create service account**
2. ชื่อ เช่น `isms-drive` → Create → ข้ามสิทธิ์ (Done)
3. เปิด service account → แท็บ **Keys → Add key → Create new key → JSON** → ดาวน์โหลดไฟล์ JSON
4. คัดลอก **อีเมลของ service account** (เช่น `isms-drive@<project>.iam.gserviceaccount.com`)

## 3) เพิ่ม Service Account เป็นสมาชิก Shared Drive
1. กลับไปที่ Shared Drive `ISMS Repository` → **จัดการสมาชิก**
2. เพิ่มอีเมล service account → สิทธิ์ **ผู้จัดการเนื้อหา (Content manager)** หรือ **ผู้จัดการ (Manager)**

## 4) ใส่ค่าลงโปรเจกต์
แปลงไฟล์ JSON key เป็น base64 แล้วใส่ `.env.local`:

```bash
# macOS/Linux/Git-Bash
base64 -w0 path/to/key.json        # คัดลอกผลลัพธ์ทั้งบรรทัด

# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("path\to\key.json"))
```

`.env.local`:
```
GOOGLE_SA_KEY_B64=<base64 ที่ได้>
ISMS_SHARED_DRIVE_ID=<Shared Drive ID จากข้อ 1>
```

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
- Service account ไม่นับเป็น "คน" → ต้นฉบับเป็นของ Shared Drive (องค์กร) ไม่หายเมื่อ admin ลาออก
- ขนาดไฟล์สูงสุดต่อการอัปโหลด 25 MB (ปรับได้ภายหลัง)
- `GOOGLE_SA_KEY_B64` = ความลับ ห้าม commit (อยู่ใน `.env.local` ที่ gitignore แล้ว)
