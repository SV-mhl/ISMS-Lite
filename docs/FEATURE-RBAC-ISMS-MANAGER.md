# Feature — RBAC + ISMS Manager role + Default Assignees

เพิ่มบทบาทกลาง **ISMS Manager** ระหว่าง admin กับ member และหน้าจัดการ **ผู้ตรวจ/ผู้อนุมัติ
เริ่มต้น** (รายกระบวนการ + ทุกกระบวนการทีเดียว) · commit `11dcfbb` (deploy prod แล้ว)

## บทบาท (3 roles)
`admin` · `isms_manager` · `member` — เก็บใน `users.role` (pgEnum `user_role`, migration `0005`)
ทุกคนที่ login ครั้งแรก = **member**

## ตารางสิทธิ์ (permission matrix)
| ความสามารถ | member | **isms_manager** | admin |
|---|:---:|:---:|:---:|
| เช็คอิน / workflow (ตรวจ–อนุมัติ–เผยแพร่) ตามงานที่ได้รับ | ✓ | ✓ | ✓ |
| ดาวน์โหลด PDF (published / งานที่เกี่ยวข้อง) | ✓ | ✓ | ✓ |
| **ตั้งผู้ตรวจ/ผู้อนุมัติเริ่มต้น** (ราย + ทุกกระบวนการ) | — | ✓ | ✓ |
| **จัดการปฏิทิน ISO** (lead_days · mark done · run reminder · Import) | — | ✓ | ✓ |
| ตั้งค่าโฟลเดอร์ Drive (bootstrap) | — | — | ✓ |
| ลบเอกสารร่าง | — | — | ✓ |
| กำหนด role ผู้ใช้ (`set-role`) | — | — | ✓ |

> **ISMS Manager = member + จัดการ default assignees + จัดการปฏิทิน/reminder** เท่านั้น
> (Drive bootstrap / ลบเอกสาร / กำหนด role ยังสงวนไว้ให้ admin)

## การบังคับสิทธิ์ (2 ชั้น)
- **UI**: `canManage(role)` (`lib/policy.ts`) = `admin || isms_manager` → ใช้ gate เมนู/ปุ่ม
  (AppBar "⚙ ผู้ตรวจ/อนุมัติ", กล่อง default ในหน้ากระบวนการ, ปุ่มจัดการปฏิทิน)
- **API**: `requireManager()` (`lib/auth-guard.ts`) → 403 ถ้าไม่ใช่ admin/manager
  - ใช้กับ: `/api/processes/[slug]/assignees` · `/api/settings/assignees/bulk` ·
    `/api/calendar/lead-days` · `/api/calendar/occurrence` · `/api/calendar/import` ·
    `/api/cron/reminders` (โหมด manual)
  - ยังเป็น `requireAdmin()`: `/api/admin/bootstrap-drive` · ลบเอกสาร (`policy.canDelete` = admin)

## หน้าจัดการ default — `/settings/assignees` (admin/manager)
- **ตั้งค่าให้ทุกกระบวนการทีเดียว**: เลือก reviewer + approver → "ใช้กับทุกกระบวนการ" → `POST /api/settings/assignees/bulk` → `setAllProcessDefaults()` (ทับทั้ง 18)
- **รายกระบวนการ**: แก้ select แล้วกด "บันทึก" → `PUT /api/processes/[slug]/assignees` → `setProcessDefault()`
- ค่า default จะ **เติมอัตโนมัติ** ตอนผู้จัดทำกด "ส่งตรวจ" (ยัง override รายเอกสารได้)
- ตัวแก้แบบ inline ในหน้ากระบวนการ (`ProcessAdminAssignees`) ก็เปิดให้ manager แล้ว

## การกำหนด role
- สคริปต์: `npm run set-role -- <email> <admin|isms_manager|member>` (`lib/db/set-role.ts`)
- ⚠️ ผู้ใช้ต้อง **login ครั้งแรกก่อน** (สร้าง record) จึง set-role ได้
- บน prod: `DATABASE_URL="<neon>" npm run set-role -- <email> isms_manager`

## ไฟล์ที่เกี่ยวข้อง
| ไฟล์ | บทบาท |
|---|---|
| `lib/db/schema.ts` | enum `user_role` เพิ่ม `isms_manager` (migration `drizzle/0005_*`) |
| `lib/policy.ts` | `AppRole` + `canManage()` |
| `lib/auth-guard.ts` | `requireManager()` |
| `lib/assignees.ts` | `setAllProcessDefaults()` · `listProcessesWithDefaults()` |
| `app/settings/assignees/page.tsx` + `components/settings-assignees.tsx` | หน้าจัดการ default |
| `app/api/settings/assignees/bulk/route.ts` | bulk endpoint |
| `lib/db/set-role.ts` | สคริปต์ตั้ง role |
| `types/next-auth.d.ts`, `auth.ts` | role union ใน session/jwt |

## การทดสอบ
- ✅ tsc + build สะอาด · **Vitest 12/12** (policy: canDownload/canDelete/availableActions)
- ✅ E2E dev: `set-role → isms_manager` (enum ยอมรับ) + cleanup
- ✅ Migration `0005` apply แล้วทั้ง dev + **Neon prod** (enum = admin, isms_manager, member)
- ✅ prod redeploy: `/settings/assignees` + `/api/settings/assignees/bulk` online
- UAT ด้วยมือ: ดู `docs/UAT-CHECKLIST.md` หมวด **2** (สิทธิ์ 3 roles + 403) และ **2.1** (ตั้ง default ทุก/รายกระบวนการ)

## หมายเหตุ (post-MVP)
- ยังไม่มีหน้า UI จัดการ role ผู้ใช้ (ใช้ `set-role` CLI) — ทำ `/settings/users` ภายหลังได้
