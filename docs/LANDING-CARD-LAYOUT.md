# Landing Map — สเปกเนื้อหาและ Layout การ์ดกระบวนการ (Y01–Y20)

เอกสารบันทึก spec ของการ "ทำความสะอาด" เนื้อหา bullet และจัดวาง layout การ์ดบนหน้า landing
(แก้ 2026-09-30 · ต่อจาก `LANDING-STATUS-INDICATORS.md` ซึ่งพูดถึงเฉดสี/สถานะ ไม่ใช่เนื้อหา/ตำแหน่ง)

## 1. กติกาเนื้อหา bullet (`lib/blueprint.ts` → `Module.bullets`)

| กติกา | รายละเอียด |
|---|---|
| **จำนวนบรรทัดสูงสุด** | ≤ 5 บรรทัดต่อกล่อง (ยืนยันโดยผู้ใช้) |
| **รวมเอกสารอ้างอิงซ้ำ** | เอกสารชุดเดียวกัน (เช่น `QP_07`, `QP_14`, `QP_18` หรือ `Risk-01/02/03`) รวมเป็นบรรทัดเดียวคั่นด้วย `·` แทนแยกบรรทัดละรายการ |
| **ภาษา** | แปลข้อความ concept (ไม่ใช่ชื่อเอกสาร/รหัสมาตรฐาน) เป็นไทยทางการ สั้นกระชับ ความหมายคงเดิม — คำที่เป็นศัพท์เทคนิคสากล (เช่น `RACI`, `C-I-A`, `BCP`, `PBC`, `CB`, `Incident`) คงไว้ไม่แปล |
| **ชื่อเอกสารอ้างอิง (`QP_xx` / `SD-xx` / `Risk-xx` / `ISMS-xx` / `FM_xx` / `SOP …`)** | วางไว้ในกล่องที่ตรงกับเนื้อหาที่เอกสารนั้นครอบคลุม (กระจายตามหัวข้อ ไม่รวมไว้ที่กล่องเดียว) — ดูตัวอย่างการวาง `SOP สำหรับทีม System Engineer` ไว้ใน **Y09** เพราะเป็นงานปฏิบัติการประจำวันของ Control Implementation |
| **ข้อยกเว้นเกินโควตา** | อนุญาตให้เกิน 5 บรรทัดได้เมื่อผู้ใช้ยืนยันเป็นกรณีไป (เช่น Y09 มี 6 บรรทัดหลังเพิ่ม SOP ใหม่) |

ตัวอย่างกล่องที่ถูกตัด/รวมจาก 6-9 บรรทัด → 5: **Y04, Y05a, Y07, Y09 (ภายหลังเพิ่มเป็น 6), Y12, Y13**

## 2. Layout การ์ด (`app/page.tsx` + `app/globals.css`)

โครงสร้าง DOM ของแต่ละการ์ด (component `Card` ใน `app/page.tsx`):

```
<Link class="card">
  <div class="ch">        ← header: เลขลำดับ (.num) + headline (.ct) + subtitle (.cs)
  <ul>                     ← bullets
  <div class="out">        ← Output line (ถ้ามี)
  <div class="code">        ← ป้าย Y01–Y20 (ย้ายออกจาก .ch แล้ว)
</Link>
```

### 2.1 ตำแหน่งป้าย Y01–Y20 (`.code`)
- **เดิม:** อยู่ใน header (`.ch`) ชิดขวา ด้วย `margin-left:auto` → กิน space แนวนอนของ headline
- **ใหม่:** ย้ายออกจาก `.ch` มาเป็น sibling สุดท้ายใน `.card`, จัดด้วย
  `position:absolute; right:15px; bottom:13px;` (ยึดมุมขวาล่างสุดของการ์ด, `.card` ต้องมี `position:relative`)
- ผลคือ headline (`.ct`/`.cs`) ใช้ความกว้างเต็มของ `.ch` ได้ทันที โดยไม่ต้องแก้ flex ของ header เลย
  (เดิม `.code` เป็น flex item แย่ง width; พอย้ายออกไปนอก flex row ของ `.ch`, `.ct`/`.cs` block ที่เหลือก็ขยายเต็มอัตโนมัติ)
- `.out` เพิ่ม `padding-right: 42px` กันข้อความ Output ยาวไปชนป้าย (กรณี Output wrap 2 บรรทัด)

### 2.2 ขนาด font ป้าย
- เดิม `.code { font-size: 9.5px }` → ใหม่ `font-size: 6.83px` (ลดลง ~2px ตามที่ผู้ใช้ระบุ "ลด 2 point" —
  ตีความเป็น px เนื่องจากทั้งไฟล์ CSS ใช้หน่วย px ไม่มี pt)

### 2.3 เส้นแบ่ง header (`.ch { border-bottom }`) จัดแนวตรงกันทุกกล่อง
- **ปัญหาเดิม:** `.ch` ไม่มีความสูงคงที่ → กล่องที่ title ยาว wrap 2 บรรทัดกับกล่องที่ title สั้น 1 บรรทัด
  มีเส้นแบ่งอยู่คนละระดับ แม้จะอยู่แถวเดียวกันใน CSS grid (การ์ดสูงเท่ากันเพราะ grid stretch แต่ `.ch` เป็น
  แค่ content ภายใน flex-column ของการ์ด ไม่ได้ stretch ตาม)
- **แก้:** ตั้ง `.ch { min-height: 62px }` — ค่านี้คือความสูง natural ของ header 1 บรรทัด title + subtitle
  (วัดจริงด้วย Playwright: `getBoundingClientRect()`)
- หลังย้ายป้าย Y0x ออกจาก header (ข้อ 2.1) ทำให้ headline มีที่เต็มความกว้าง → **ทุก title พอดี 1 บรรทัดตามธรรมชาติ
  โดยไม่ต้อง wrap แล้ว** ผลคือทุกกล่องมี `.ch` สูง 62px เท่ากันหมด (ยืนยันด้วยสคริปต์วัด: `unique heights = [62]`)
  เส้นแบ่งจึงตรงกันในทุกแถวทุก Phase โดยอัตโนมัติ ไม่ต้องพึ่งค่า min-height สูงเผื่อ 2 บรรทัดอีกต่อไป
- **ถ้าในอนาคตมี title ยาวจน wrap 2 บรรทัดอีก** ต้องวัดความสูง `.ch` ใหม่ทุกกล่อง (สคริปต์ตัวอย่างอยู่ที่
  scratchpad ของ session ที่แก้ไข — แนวทาง: `page.$$eval('.ch', els => els.map(el => el.getBoundingClientRect().height))`
  แล้วปรับ `min-height` เป็นค่ามากสุดที่วัดได้ + ปัดขึ้นเล็กน้อย)

## 3. ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | บทบาท |
|---|---|
| `lib/blueprint.ts` | เนื้อหา bullet/title/subtitle/output ของทุกกล่อง (source of truth) |
| `app/page.tsx` | component `Card` — ลำดับ DOM ของ header/bullets/output/code badge |
| `app/globals.css` | `.ch` (min-height), `.code` (position/font-size), `.out` (padding-right), `.card` (position:relative) |

## 4. Fence — ไม่ได้แตะ
- เฉดสีการ์ด/Output เขียวตามสถานะเอกสาร (`LANDING-STATUS-INDICATORS.md`) — คนละ concern, ไม่กระทบกัน
- โครงสร้าง Phase/band, traceability chain, footer chips
- Logic การ query `getProcessDocFlags()`
