# Step 2 — ตั้งค่า Google OAuth (สำหรับผู้ดูแลระบบมโหฬาร)

คู่มือสร้าง **OAuth Client** ใน Google Cloud Console เพื่อให้ ISMS-Lite ล็อกอินด้วย Google
และเข้าถึง Google Drive ได้ ใช้เวลา ~10 นาที ทำครั้งเดียว

> 💡 ใช้บัญชี Google Workspace **@maholan.co.th** ที่มีสิทธิ์ผู้ดูแล (หรือขอให้ IT ทำให้)

---

## 1) สร้าง/เลือกโปรเจกต์
1. เข้า https://console.cloud.google.com/
2. มุมบนซ้าย → เลือกโปรเจกต์ → **New Project** → ตั้งชื่อ เช่น `isms-lite-maholan` → Create

## 2) เปิดใช้ Google Drive API
1. เมนู → **APIs & Services → Library**
2. ค้น **Google Drive API** → **Enable**

## 3) ตั้งค่า OAuth consent screen
1. **APIs & Services → OAuth consent screen**
2. User Type → เลือก **Internal** ⭐ (จำกัดเฉพาะผู้ใช้ในองค์กร @maholan.co.th อัตโนมัติ — ไม่ต้องผ่านการ verify ของ Google)
3. กรอก App name = `ISMS-Lite`, support email = อีเมลคุณ, developer email = อีเมลคุณ → Save
4. Scopes → ไม่ต้องเพิ่มด้วยมือ (แอปขอ scope ตอนล็อกอินเอง: `email`, `profile`, `drive.file`)

## 4) สร้าง OAuth Client ID
1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Application type → **Web application**
3. Name → `ISMS-Lite Web`
4. **Authorized redirect URIs** → Add URI:
   - Dev: `http://localhost:3000/api/auth/callback/google`
   - Prod (เพิ่มภายหลังตอน deploy): `https://<โดเมนจริง>/api/auth/callback/google`
5. Create → จะได้ **Client ID** และ **Client Secret**

## 5) ใส่ค่าลงในโปรเจกต์
เปิดไฟล์ `.env.local` แล้วแทนค่า 2 บรรทัดนี้:

```
AUTH_GOOGLE_ID=<Client ID ที่ได้>
AUTH_GOOGLE_SECRET=<Client Secret ที่ได้>
```

(ค่า `AUTH_SECRET` ถูกสร้างให้อัตโนมัติแล้ว)

## 6) ทดสอบ
```bash
npm run dev
```
เปิด http://localhost:3000 → คลิก **เข้าสู่ระบบด้วย Google** → เลือกบัญชี @maholan.co.th
- ✅ ถ้าเป็น @maholan.co.th → เข้าได้ + เห็นชื่อผู้ใช้บนแถบบน
- ❌ ถ้าใช้ Gmail ทั่วไป → ถูกปฏิเสธ (AccessDenied)

## 7) ตั้งผู้ดูแล (admin) คนแรก
ทุกคนที่ล็อกอินครั้งแรกจะเป็น **member** โปรโมทเป็น admin ด้วยคำสั่ง:

```bash
npm run promote-admin -- someone@maholan.co.th
```

---

### หมายเหตุความปลอดภัย
- **Internal consent screen** = เฉพาะบัญชีในโดเมนองค์กรเท่านั้นที่ใช้ได้ (ชั้นที่ 1)
- โค้ดยังตรวจซ้ำว่าอีเมลลงท้าย `@maholan.co.th` และ verified แล้ว (ชั้นที่ 2)
- ใช้ scope `drive.file` = แอปเห็นเฉพาะไฟล์ที่ตัวเองสร้าง/เปิด ไม่เห็น Drive ทั้งหมดของผู้ใช้
- Client Secret และ `.env.local` **ห้าม commit** (ถูก gitignore ไว้แล้ว)
