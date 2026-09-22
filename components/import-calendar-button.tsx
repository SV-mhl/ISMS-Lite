"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ImportCalendarButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState(2027);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dup, setDup] = useState<{ count: number } | null>(null);

  function reset() {
    setFile(null); setYear(2027); setErr(null); setDup(null);
  }

  async function submit(force: boolean) {
    if (!file) { setErr("กรุณาแนบไฟล์ .pdf"); return; }
    setBusy(true); setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("year", String(year));
      fd.append("force", String(force));
      const res = await fetch("/api/calendar/import", { method: "POST", body: fd });
      const data = await res.json();
      if (res.status === 409 && data.code === "PLAN_EXISTS") {
        setDup({ count: data.existingCount ?? 0 });
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "นำเข้าไม่สำเร็จ");
      setOpen(false); reset();
      router.push(`/calendar?year=${year}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { reset(); setOpen(true); }}
        style={{ textDecoration: "none", fontSize: 13, fontWeight: 600, color: "#3f6191", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        title="นำเข้าปฏิทินกิจกรรมจากไฟล์ PDF"
      >
        ⬆️ Import ปฏิทิน
      </button>

      {open && (
        <div style={overlay} onClick={() => !busy && setOpen(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0d356f", marginBottom: 4 }}>
              นำเข้าปฏิทินงาน ISO (Action Plan)
            </div>
            <div style={{ fontSize: 12, color: "#7189a8", marginBottom: 14 }}>
              แนบไฟล์ Action Plan (.pdf) แล้วระบบจะสร้างปฏิทินของปีที่เลือก
            </div>

            <label style={label}>ไฟล์ปฏิทิน (.pdf)</label>
            <input type="file" accept="application/pdf,.pdf"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setDup(null); }}
              style={{ fontSize: 13, marginBottom: 12 }} />

            <label style={label}>ปีงบประมาณ (ค.ศ.)</label>
            <input type="number" min={2000} max={2100} value={year}
              onChange={(e) => { setYear(Number(e.target.value)); setDup(null); }}
              style={{ width: 120, padding: "8px 10px", border: "1px solid #d7e0ec", borderRadius: 8, fontSize: 13.5 }} />
            <div style={{ fontSize: 11, color: "#9db0c8", marginTop: 4 }}>
              เช่น 2027 = ต.ค. 2026 – ก.ย. 2027 (พ.ศ. {year + 543})
            </div>

            {dup && (
              <div style={{ marginTop: 14, background: "#fff8e6", border: "1px solid #f0dca0", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, color: "#8a6d1f", lineHeight: 1.6 }}>
                ⚠️ ปฏิทินปี {year} มีอยู่แล้ว ({dup.count} รายการ) — การนำเข้าซ้ำจะ <b>ลบของเดิมและแทนที่ทั้งหมด</b> (รวมสถานะที่ทำเสร็จ)
              </div>
            )}
            {err && <div style={{ color: "#b23b3b", fontSize: 12.5, marginTop: 10 }}>{err}</div>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
              <button type="button" disabled={busy} onClick={() => setOpen(false)}
                style={{ ...btn, borderColor: "#d7e0ec", color: "#5d7791" }}>ยกเลิก</button>
              {dup ? (
                <button type="button" disabled={busy} onClick={() => submit(true)}
                  style={{ ...btn, borderColor: "#b5730f", color: "#fff", background: "#b5730f" }}>
                  {busy ? "กำลังทับ…" : "ทับของเดิม"}
                </button>
              ) : (
                <button type="button" disabled={busy} onClick={() => submit(false)}
                  style={{ ...btn, borderColor: "#1450a8", color: "#fff", background: "#1450a8" }}>
                  {busy ? "กำลังนำเข้า…" : "นำเข้า"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(10,30,60,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 60 };
const modal: React.CSSProperties = { background: "#fff", borderRadius: 14, padding: "22px 24px", width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(10,30,60,0.3)" };
const label: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "#3f6191", margin: "8px 0 5px" };
const btn: React.CSSProperties = { fontSize: 13, fontWeight: 600, border: "1px solid", borderRadius: 8, padding: "9px 16px", cursor: "pointer", background: "#fff" };
