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

## 3) ตั้งค่า OAuth consent screen (Google Auth Platform)

> หน้านี้คือ "หน้าจอขอความยินยอม" ที่ผู้ใช้เห็นตอนกดล็อกอิน Google ต้องตั้งครั้งเดียวก่อนสร้าง Client

**วิธีเข้า:** เมนู ☰ ซ้ายบน → **APIs & Services → OAuth consent screen**
(ถ้าเด้งไปหน้า **Google Auth Platform** ถือว่าถูกแล้ว — Google ย้ายมาที่นี่)

### ถ้าเห็นปุ่ม "Get started" (โปรเจกต์ใหม่ยังไม่เคยตั้ง)
คลิก **Get started** แล้วกรอกทีละหน้า:

1. **App Information**
   - App name: `ISMS-Lite`
   - User support email: เลือกอีเมลคุณ (`surachot.vi@maholan.co.th`)
   - → **Next**

2. **Audience** ⭐ (สำคัญที่สุด)
   - เลือก **Internal** — หมายถึง *เฉพาะบัญชีในองค์กร @maholan.co.th เท่านั้นที่ใช้ได้*
   - ข้อดี: ไม่ต้องส่ง Google ตรวจ (verification), ไม่มีหน้าจอ "unverified app" สีแดง
   - 💡 ถ้าเลือก Internal **ไม่ได้** (เป็นสีเทา) = บัญชีที่ใช้ยังไม่ใช่ Google Workspace admin หรือโปรเจกต์ไม่ได้อยู่ใต้องค์กร → ให้ IT ช่วย หรือดูหมายเหตุท้ายเอกสาร
   - → **Next**

3. **Contact Information**
   - Email addresses: ใส่อีเมลคุณ (ไว้ให้ Google แจ้งเตือน) → **Next**

4. **Finish** — ติ๊กยอมรับ *User Data Policy* → **Create**

### ถ้าตั้งไว้แล้ว / เห็นแท็บต่าง ๆ
จะเห็นแท็บ: **Overview · Branding · Audience · Clients · Data Access**
- **Audience** = ต้องเป็น **Internal** (ถ้าเป็น External ให้เปลี่ยน หรือดูหมายเหตุ)
- **Data Access** (scopes) = **ไม่ต้องเพิ่มเอง** แอปจะขอ scope ตอนล็อกอิน (`email`, `profile`, `drive.file`)
- **Branding** = App name/โลโก้ (ใส่แล้วในขั้น Get started)

✅ เสร็จขั้นนี้แล้วไปข้อ 4 (สร้าง OAuth Client ID) ได้เลย

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

### ถ้าเลือก Internal ไม่ได้ (ไม่ใช่ Workspace admin / โปรเจกต์ไม่อยู่ใต้องค์กร)
ทางเลี่ยงชั่วคราวสำหรับ dev:
1. Audience → เลือก **External** + **Testing**
2. เพิ่มอีเมลของคุณใน **Test users**
3. ล็อกอินได้เฉพาะอีเมลที่เป็น test user (โค้ดยังกัน `@maholan.co.th` อยู่ดี)

> ตอน deploy production ควรกลับมาใช้ **Internal** (ให้ IT/Workspace admin ทำ) เพื่อไม่ต้องผ่าน Google verification

### หมายเหตุความปลอดภัย
- **Internal consent screen** = เฉพาะบัญชีในโดเมนองค์กรเท่านั้นที่ใช้ได้ (ชั้นที่ 1)
- โค้ดยังตรวจซ้ำว่าอีเมลลงท้าย `@maholan.co.th` และ verified แล้ว (ชั้นที่ 2)
- ใช้ scope `drive.file` = แอปเห็นเฉพาะไฟล์ที่ตัวเองสร้าง/เปิด ไม่เห็น Drive ทั้งหมดของผู้ใช้
- Client Secret และ `.env.local` **ห้าม commit** (ถูก gitignore ไว้แล้ว)
