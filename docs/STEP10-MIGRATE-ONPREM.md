# STEP 10 — ย้าย Production ไป On-Prem/Cloud ของมโหฬาร (`maholan.net`)

สถานะ: **แผนเตรียมการ (ยังไม่ execute)** · ร่างเมื่อ 2026-10-09
ครอบคลุม 2 งาน: (A) ย้าย DB Neon → VM-DB cloud มโหฬาร, (B) ย้าย app ออกจาก Vercel → host เองบน `maholan.net`

> งานนี้แตะ production ที่มีผู้ใช้จริงอยู่ (`surachot.vi@maholan.co.th` = admin,
> `sornkanok.ch@maholan.co.th` = isms_manager) — ต้องมี maintenance window และ rollback plan ก่อนลงมือจริง

---

## 0. ข้อมูลที่ต้องขอจาก IT มโหฬาร ก่อนเริ่ม (Fence — ผมตอบแทนไม่ได้)

| ต้องรู้ | เพราะอะไร |
|---|---|
| **VM-DB**: OS, PostgreSQL version, CPU/RAM/disk, อยู่ network เดียวกับ VM-App ไหม | ต้อง match กับ `postgres-js` driver + Drizzle dialect `postgresql`; เวอร์ชัน Postgres ต่างกันมากอาจมีปัญหา extension/syntax |
| **VM-App**: มี VM แยกสำหรับรัน Node.js ไหม, OS, reverse proxy ที่ใช้อยู่แล้วบน `maholan.net` (Nginx/IIS/Caddy) | กำหนดวิธี deploy (systemd service vs Docker vs IIS reverse proxy) |
| **DNS**: ใครดูแล `maholan.net` zone, จะใช้ subdomain อะไร (เช่น `isms.maholan.net`) | ต้องสร้าง A/CNAME record + ออก TLS cert ให้ตรงชื่อ |
| **TLS cert**: มี internal CA/wildcard cert ของบริษัทอยู่แล้วไหม หรือจะใช้ Let's Encrypt | กำหนดขั้นตอนขอ/ติดตั้ง cert |
| **Firewall**: VM-App คุยกับ VM-DB ทาง private network หรือ public IP + allowlist | กำหนด `sslmode` และ connection string ที่ปลอดภัย |
| **Deploy mechanism**: มี CI/CD (GitHub Actions runner ภายใน) อยู่แล้วไหม หรือ deploy มือ (SSH) | กำหนด pipeline ของงาน B |
| **Backup policy ของ VM-DB**: มี snapshot/pg_dump cron ให้อยู่แล้วไหม | Neon มี PITR ให้ในตัว — ย้ายออกมาแล้วต้องทำเอง |
| **Google OAuth app**: ใครมีสิทธิ์แก้ Authorized redirect URI ใน Google Cloud Console (project ปัจจุบันของ `surachot.vi@maholan.co.th`) | ต้องเพิ่ม redirect URI ของโดเมนใหม่ก่อน cutover |

ผมจะร่างแผนต่อโดย **สมมติฐานที่พบบ่อยที่สุด** (ระบุไว้ชัดแต่ละจุด) — ถ้าจริงต่างจากนี้ ปรับ step ตามจริงได้

---

## 1. ภาพรวม state ปัจจุบัน (จากเอกสาร/โค้ดในโปรเจกต์)

- **App:** Next.js 16 (App Router) บน Vercel, auto-deploy จาก `git push origin master`
- **DB:** Neon (Singapore, pooled), schema ผ่าน Drizzle migrations ที่ `drizzle/` (ล่าสุด `0006`)
- **Auth:** Auth.js v5 + Google OAuth, `AUTH_URL=https://isms-lite.vercel.app`, จำกัด domain อีเมล `maholan.co.th`
- **Storage:** Google Drive (Shared Drive) — **ไม่เกี่ยวกับ VM migration นี้เลย** เพราะเป็น Google API ไม่ใช่ local storage (Fence: ไม่ต้องแตะ)
- **Cron:** Vercel Cron เดียว (`/api/cron/reminders` ทุกวัน 01:00 UTC, auth ด้วย `CRON_SECRET`)
- **Env vars ที่ต้องย้าย:** `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_GOOGLE_ID/SECRET`, `ALLOWED_EMAIL_DOMAIN`, `STORAGE_ACCOUNT_EMAIL`, `ISMS_SHARED_DRIVE_ID`, `CRON_SECRET`, (`RESEND_API_KEY`/`EMAIL_FROM` ถ้าเปิดแล้ว)
- **โค้ดที่ต้องเตรียมเพิ่มก่อน deploy แบบ self-host:** `next.config.ts` ยังไม่มี `output: "standalone"` — ต้องเพิ่มก่อน (ดูข้อ 4.1)

---

## 2. ลำดับที่แนะนำ: **ย้าย DB ก่อน แล้วค่อยย้าย App**

เหตุผล: ย้าย DB ก่อนจะได้ทดสอบว่า Vercel (ของเดิม) ต่อ VM-DB ได้จริงก่อน โดยยังไม่ยุ่งกับ DNS/hosting —
ลด variable ที่เปลี่ยนพร้อมกันในแต่ละขั้น (เปลี่ยนทีละอย่าง ง่ายต่อการ rollback)

```
Phase A: Neon → VM-DB          (app ยังอยู่ Vercel ชี้ไปที่ VM-DB ใหม่)
Phase B: Vercel → VM-App        (app ย้าย host, DB อยู่ VM-DB เดิมจาก Phase A)
Phase C: DNS cutover → maholan.net subdomain + TLS + Google OAuth redirect
```

---

## 3. Phase A — Migrate Neon → VM-DB

### 3.1 เตรียม VM-DB
1. ติดตั้ง PostgreSQL (เวอร์ชันเดียวกับ/ใหม่กว่า Neon ใช้ — เช็คด้วย `psql $NEON_URL -c "SELECT version();"`)
2. สร้าง DB + user: `CREATE DATABASE isms_lite_prod; CREATE USER isms_app WITH PASSWORD '...';`
3. ตั้ง `pg_hba.conf` / firewall ให้รับ connection จาก VM-App เท่านั้น (ไม่เปิด public ถ้าไม่จำเป็น) + บังคับ `sslmode=require`

### 3.2 Schema — ใช้ Drizzle migration ที่มีอยู่ (ไม่ใช่ copy ตรงจาก Neon)
```bash
DATABASE_URL="postgres://isms_app:***@<vm-db-host>:5432/isms_lite_prod?sslmode=require" npm run db:migrate
```
รันไฟล์ migration ทั้งหมดใน `drizzle/` ตามลำดับ (`0000`…`0006`) ให้ schema ตรงกับ Neon เป๊ะ — วิธีนี้ปลอดภัยกว่า
dump schema ตรงจาก Neon เพราะ idempotent และ repo มี source of truth อยู่แล้ว

### 3.3 Data migration
```bash
# Dump ข้อมูลจาก Neon (data only — schema สร้างจาก migration ไปแล้ว)
pg_dump "$NEON_URL" --data-only --no-owner --no-privileges -f neon_data.sql

# Restore เข้า VM-DB
psql "$VM_DB_URL" -f neon_data.sql
```
- เช็ค row count ทุกตารางให้ตรงกัน: `SELECT relname, n_live_tup FROM pg_stat_user_tables;` เทียบ 2 ฝั่ง
- ระวัง sequence/identity counter เพี้ยนหลัง data-only restore → รัน `SELECT setval(...)` ให้ sequence แต่ละตารางตรงกับ `MAX(id)`

### 3.4 ทดสอบก่อน cutover จริง
- ตั้ง `DATABASE_URL` ใหม่บน **Vercel Preview environment** (ไม่ใช่ Production) ชี้ไป VM-DB → ทดสอบ login/checkin/approve ครบ flow
- รัน `npm run test` + smoke test ด้วยมือผ่าน Preview URL

### 3.5 Cutover (maintenance window สั้น)
1. แจ้งผู้ใช้ล่วงหน้า (2 คนตอนนี้) ว่าจะมี downtime สั้น
2. Freeze การเขียนชั่วคราว (หรือเลือกเวลาที่ไม่มีใครใช้งาน)
3. Dump data delta รอบสุดท้าย (เหมือนข้อ 3.3) → restore ทับ VM-DB
4. เปลี่ยน `DATABASE_URL` บน **Production** env ของ Vercel → `DATABASE_URL="<vm-db-url>"`
5. Redeploy (Vercel จะ pick env ใหม่) → smoke test จริง (login, เปิดเอกสาร, dashboard)
6. **เก็บ Neon ไว้เป็น read-only fallback ~1-2 สัปดาห์** ก่อนปิด/ลบ (rollback plan)

---

## 4. Phase B — ย้าย App ออกจาก Vercel → VM-App

### 4.1 โค้ดที่ต้องแก้ก่อน (ใน repo นี้)
`next.config.ts` ต้องเพิ่ม `output: "standalone"` เพื่อให้ได้ build bundle แบบ self-contained
(ปัจจุบันไม่มี บรรทัดนี้สำคัญเพราะ `next start` ธรรมดาต้องมี `node_modules` เต็ม ส่วน `standalone`
จะ copy เฉพาะ dependency ที่ใช้จริง เบากว่าเยอะสำหรับ deploy บน VM):
```ts
const nextConfig: NextConfig = {
  output: "standalone",
  async headers() { /* เดิม */ },
};
```

### 4.2 Build pipeline บน VM (หรือ build บนเครื่อง dev แล้ว rsync ก็ได้)
```bash
npm ci
npm run build          # ได้ .next/standalone + .next/static
# รันจริง:
node .next/standalone/server.js   # ฟัง PORT env (default 3000)
```

### 4.3 Process manager — เลือก 1 ใน 2 (ถามข้อ 0 ว่า IT มีมาตรฐานอยู่แล้วไหม)
- **systemd** (ง่าย ไม่ต้องติดตั้งอะไรเพิ่มถ้า VM เป็น Linux): เขียน unit file
  `/etc/systemd/system/isms-lite.service` → `ExecStart=node /opt/isms-lite/.next/standalone/server.js`,
  `Environment=` หรือ `EnvironmentFile=/opt/isms-lite/.env.production`, `Restart=always`
- **Docker**: เขียน Dockerfile แบบ multi-stage (build → copy `standalone` output) — เหมาะถ้า IT ใช้ container
  platform อยู่แล้ว (เช่น มี Portainer/K8s)

### 4.4 Reverse proxy (Nginx ตัวอย่าง — ปรับตาม stack จริงของ `maholan.net`)
```nginx
server {
  listen 443 ssl;
  server_name isms.maholan.net;
  ssl_certificate     /path/to/fullchain.pem;
  ssl_certificate_key /path/to/privkey.pem;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```
Auth.js ต้องเห็น `X-Forwarded-Proto`/`Host` ถูกต้อง (มี `trustHost: true` อยู่แล้วใน `auth.ts` — ใช้ได้กับ reverse proxy)

### 4.5 Cron — ไม่มี Vercel Cron แล้ว ต้องแทนด้วย OS-level scheduler
```cron
# crontab -e บน VM-App (เวลาแปลงจาก Vercel schedule "0 1 * * *" UTC → เวลาไทย)
0 8 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://isms.maholan.net/api/cron/reminders
```
(ยังใช้ `CRON_SECRET` เดิมที่โค้ด `/api/cron/reminders` ตรวจอยู่แล้ว — ไม่ต้องแก้โค้ด)

### 4.6 Deploy mechanism แทน "git push → Vercel auto-redeploy"
ถ้ายังไม่มี CI/CD ภายใน แนะนำ **GitHub Actions self-hosted runner** วางบน VM-App เอง หรือ
script ง่ายๆ แบบ SSH deploy (`git pull && npm ci && npm run build && systemctl restart isms-lite`)
รันด้วยมือก่อนในช่วงแรกจนกว่าจะอยาก automate

---

## 5. Phase C — DNS + TLS + Google OAuth cutover

1. **ก่อน cutover:** เพิ่ม Authorized redirect URI ใหม่ใน Google Cloud Console
   (`https://isms.maholan.net/api/auth/callback/google`) **ควบคู่** กับของเดิม (อย่าลบของเดิมจนกว่าจะ cutover สำเร็จ)
2. ตั้ง env บน VM-App: `AUTH_URL=https://isms.maholan.net`
3. สร้าง DNS record `isms.maholan.net` → ชี้ IP ของ VM-App (A record) หรือ CNAME ตาม topology จริง
4. ออก/ติดตั้ง TLS cert ให้ตรงชื่อโดเมนใหม่
5. Smoke test ผ่านโดเมนใหม่ให้ครบ (login Google, เช็คอินเอกสาร, แจ้งเตือน, cron endpoint ด้วยมือ 1 ครั้ง)
6. ปิด Vercel deployment (หรือเก็บไว้เป็น staging แยกก็ได้ ถ้าอยากมี pre-prod)
7. ลบ redirect URI เก่าออกจาก Google Console หลังมั่นใจว่าไม่มีใครใช้ domain เดิมแล้ว

---

## 6. Checklist สรุปก่อนลงมือจริง

- [ ] ได้คำตอบข้อ 0 ครบจาก IT มโหฬาร (VM-DB spec, VM-App spec, DNS/TLS owner, firewall, backup policy)
- [ ] Neon connection string (เดิม) ใช้ได้สำหรับ pg_dump ระหว่าง migration
- [ ] นัด maintenance window กับผู้ใช้ 2 คนปัจจุบัน
- [ ] เพิ่ม `output: "standalone"` ใน `next.config.ts` + ทดสอบ build local ก่อน
- [ ] เพิ่ม Google OAuth redirect URI ใหม่ไว้ล่วงหน้า
- [ ] มีแผน backup/cron สำหรับ VM-DB (Neon ไม่ได้ให้ฟรีอีกแล้วหลังย้าย)
- [ ] ตกลง rollback window (เก็บ Neon + Vercel ไว้กี่วันก่อนปิด)

## 7. Fence — สิ่งที่ "ไม่เปลี่ยน" จากงานนี้
- Google Drive storage (Shared Drive, OAuth token ของ `surachot.vi@maholan.co.th`) — คนละระบบ ไม่ได้ย้าย
- RBAC/logic เอกสารทั้งหมดในแอป — งานนี้คือ infra เท่านั้น ไม่แตะโค้ด business logic
- Schema ฐานข้อมูล — ใช้ migration เดิมเป๊ะ ไม่ปรับ schema ระหว่างย้าย
