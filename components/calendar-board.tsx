"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImportCalendarButton from "@/components/import-calendar-button";

export type OccSerial = {
  id: string;
  dueDate: string;
  periodLabel: string;
  status: string;
  remindedAt: string | null;
};
export type ItemSerial = {
  id: string;
  seq: number;
  title: string;
  responsible: string | null;
  qpRef: string | null;
  category: string | null;
  cadence: string;
  leadDays: number;
  active: boolean;
  occurrences: OccSerial[];
};

const CADENCE_TH: Record<string, string> = {
  monthly: "รายเดือน", quarterly: "รายไตรมาส", biannual: "ทุก 6 เดือน", annual: "รายปี", once: "ครั้งเดียว",
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" });
}

function occStyle(o: OccSerial): { bg: string; fg: string } {
  if (o.status === "done") return { bg: "#e6f6ec", fg: "#178048" };
  const due = new Date(o.dueDate).getTime();
  const now = Date.now();
  if (due < now) return { bg: "#fdeeee", fg: "#b23b3b" }; // overdue
  if (due - now < 14 * 86400000) return { bg: "#fff3e0", fg: "#b5730f" }; // soon
  return { bg: "#eef4fc", fg: "#3f6191" };
}

export default function CalendarBoard({
  items,
  isAdmin,
  year,
  years,
}: {
  items: ItemSerial[];
  isAdmin: boolean;
  year: number;
  years: number[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [lead, setLead] = useState<Record<string, number>>(
    Object.fromEntries(items.map((i) => [i.id, i.leadDays])),
  );

  async function runReminders() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/cron/reminders", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "ไม่สำเร็จ");
      setMsg(`ส่งการแจ้งเตือน ${d.sent} รายการ`);
      router.refresh();
    } catch (e) { setMsg(e instanceof Error ? e.message : "error"); } finally { setBusy(false); }
  }

  async function saveLead(itemId: string) {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/calendar/lead-days", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, leadDays: lead[itemId] }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "ไม่สำเร็จ");
      setMsg("บันทึกวันแจ้งเตือนแล้ว");
      router.refresh();
    } catch (e) { setMsg(e instanceof Error ? e.message : "error"); } finally { setBusy(false); }
  }

  async function toggleDone(occId: string, done: boolean) {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/calendar/occurrence", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occId, done }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "ไม่สำเร็จ");
      router.refresh();
    } catch (e) { setMsg(e instanceof Error ? e.message : "error"); } finally { setBusy(false); }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <label style={{ fontSize: 12.5, color: "#7189a8", display: "inline-flex", alignItems: "center", gap: 6 }}>
          ปีงบประมาณ (FY)
          <select value={year} onChange={(e) => router.push(`/calendar?year=${e.target.value}`)}
            style={{ padding: "4px 8px", border: "1px solid #d7e0ec", borderRadius: 6, fontSize: 12.5 }}>
            {years.map((y) => <option key={y} value={y}>{y} (พ.ศ. {y + 543})</option>)}
          </select>
        </label>
        <div style={{ fontSize: 12.5, color: "#7189a8" }}>· {items.length} รายการ</div>
        {isAdmin && (
          <button type="button" onClick={runReminders} disabled={busy} className="btn-google" style={{ marginLeft: 0, fontSize: 12.5 }}>
            {busy ? "กำลังส่ง…" : "▶ ส่งแจ้งเตือนที่ถึงกำหนดตอนนี้"}
          </button>
        )}
        {isAdmin && <ImportCalendarButton />}
        {msg && <span style={{ fontSize: 12, color: "#178048" }}>{msg}</span>}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#7189a8", fontSize: 11 }}>
              <th style={{ padding: "8px 10px" }}>#</th>
              <th style={{ padding: "8px 10px" }}>งาน ISO</th>
              <th style={{ padding: "8px 10px" }}>วงรอบ</th>
              <th style={{ padding: "8px 10px" }}>แจ้งล่วงหน้า</th>
              <th style={{ padding: "8px 10px" }}>กำหนดการ (แต่ละงวด)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} style={{ borderTop: "1px solid #eef3fa", verticalAlign: "top" }}>
                <td style={{ padding: "10px", color: "#9db0c8" }}>{i.seq}</td>
                <td style={{ padding: "10px", maxWidth: 320 }}>
                  <div style={{ fontWeight: 600, color: "#12233f" }}>{i.title}</div>
                  <div style={{ fontSize: 11, color: "#9db0c8" }}>
                    {[i.qpRef, i.responsible, i.category].filter(Boolean).join(" · ")}
                  </div>
                </td>
                <td style={{ padding: "10px", whiteSpace: "nowrap", color: "#5d7791" }}>{CADENCE_TH[i.cadence] ?? i.cadence}</td>
                <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                  {isAdmin ? (
                    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                      <input type="number" min={0} max={120} value={lead[i.id]}
                        onChange={(e) => setLead((s) => ({ ...s, [i.id]: Number(e.target.value) }))}
                        style={{ width: 52, padding: "4px 6px", border: "1px solid #d7e0ec", borderRadius: 6, fontSize: 12 }} />
                      <span style={{ color: "#7189a8" }}>วัน</span>
                      {lead[i.id] !== i.leadDays && (
                        <button type="button" onClick={() => saveLead(i.id)} disabled={busy}
                          style={{ fontSize: 11, color: "#1a4c9e", border: "1px solid #cfe0f4", borderRadius: 6, padding: "3px 7px", cursor: "pointer", background: "#fff" }}>
                          บันทึก
                        </button>
                      )}
                    </span>
                  ) : (
                    <span style={{ color: "#5d7791" }}>{i.leadDays} วัน</span>
                  )}
                </td>
                <td style={{ padding: "10px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {i.occurrences.map((o) => {
                      const s = occStyle(o);
                      return (
                        <span key={o.id}
                          onClick={isAdmin ? () => toggleDone(o.id, o.status !== "done") : undefined}
                          title={isAdmin ? "คลิกเพื่อสลับสถานะเสร็จ/ค้าง" : undefined}
                          style={{ fontSize: 11, fontWeight: 600, background: s.bg, color: s.fg,
                            padding: "3px 8px", borderRadius: 7, whiteSpace: "nowrap",
                            cursor: isAdmin ? "pointer" : "default" }}>
                          {o.status === "done" ? "✓ " : ""}{fmt(o.dueDate)}
                        </span>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
