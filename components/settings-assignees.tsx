"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type UserOpt = { id: string; name: string | null; email: string };
export type ProcRow = {
  id: string; code: string; slug: string; title: string;
  reviewerId: string | null; approverId: string | null;
};

export default function SettingsAssignees({
  processes,
  users,
}: {
  processes: ProcRow[];
  users: UserOpt[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // bulk
  const [bulkR, setBulkR] = useState("");
  const [bulkA, setBulkA] = useState("");

  // per-process working state
  const [rows, setRows] = useState<Record<string, { r: string; a: string }>>(
    Object.fromEntries(processes.map((p) => [p.id, { r: p.reviewerId ?? "", a: p.approverId ?? "" }])),
  );

  async function applyAll() {
    if (!confirm("ตั้งผู้ตรวจ/ผู้อนุมัตินี้ให้ทุกกระบวนการ (18) ? จะทับค่าเดิมทั้งหมด")) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/settings/assignees/bulk", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerId: bulkR || null, approverId: bulkA || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "ไม่สำเร็จ");
      setMsg("ตั้งค่าให้ทุกกระบวนการแล้ว");
      router.refresh();
    } catch (e) { setMsg(e instanceof Error ? e.message : "error"); } finally { setBusy(false); }
  }

  async function saveOne(p: ProcRow) {
    setBusy(true); setMsg(null);
    try {
      const st = rows[p.id];
      const res = await fetch(`/api/processes/${p.slug}/assignees`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerId: st.r || null, approverId: st.a || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "ไม่สำเร็จ");
      setMsg(`บันทึก ${p.code} แล้ว`);
      router.refresh();
    } catch (e) { setMsg(e instanceof Error ? e.message : "error"); } finally { setBusy(false); }
  }

  const opts = (
    <>
      <option value="">— ไม่กำหนด —</option>
      {users.map((u) => <option key={u.id} value={u.id}>{u.name ?? u.email}</option>)}
    </>
  );

  return (
    <div style={{ maxWidth: 900 }}>
      {msg && <div style={{ fontSize: 12.5, color: "#178048", marginBottom: 10 }}>{msg}</div>}

      {/* Bulk */}
      <div style={{ background: "#eef4fc", border: "1px solid #cfe0f4", borderRadius: 12, padding: "16px 18px", marginBottom: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#0d356f", marginBottom: 10 }}>
          ตั้งค่าเริ่มต้นให้ <u>ทุกกระบวนการ</u> (18) ทีเดียว
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={lbl}>ผู้ตรวจเริ่มต้น
            <select value={bulkR} onChange={(e) => setBulkR(e.target.value)} style={sel}>{opts}</select>
          </label>
          <label style={lbl}>ผู้อนุมัติเริ่มต้น
            <select value={bulkA} onChange={(e) => setBulkA(e.target.value)} style={sel}>{opts}</select>
          </label>
          <button type="button" onClick={applyAll} disabled={busy} className="btn-google" style={{ marginLeft: 0 }}>
            {busy ? "กำลังบันทึก…" : "ใช้กับทุกกระบวนการ"}
          </button>
        </div>
      </div>

      {/* Per-process */}
      <div style={{ fontWeight: 700, fontSize: 14, color: "#0d356f", marginBottom: 8 }}>รายกระบวนการ</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#7189a8", fontSize: 11.5 }}>
              <th style={th}>กระบวนการ</th><th style={th}>ผู้ตรวจ</th><th style={th}>ผู้อนุมัติ</th><th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {processes.map((p) => {
              const st = rows[p.id];
              const dirty = st.r !== (p.reviewerId ?? "") || st.a !== (p.approverId ?? "");
              return (
                <tr key={p.id} style={{ borderTop: "1px solid #eef3fa" }}>
                  <td style={{ padding: "8px 10px" }}>
                    <span style={{ fontWeight: 700, color: "#3f6191" }}>{p.code}</span>{" "}
                    <span style={{ color: "#12233f" }}>{p.title}</span>
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <select value={st.r} onChange={(e) => setRows((s) => ({ ...s, [p.id]: { ...s[p.id], r: e.target.value } }))} style={sel}>{opts}</select>
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <select value={st.a} onChange={(e) => setRows((s) => ({ ...s, [p.id]: { ...s[p.id], a: e.target.value } }))} style={sel}>{opts}</select>
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    {dirty && (
                      <button type="button" onClick={() => saveOne(p)} disabled={busy}
                        style={{ fontSize: 12, color: "#1a4c9e", border: "1px solid #cfe0f4", borderRadius: 7, padding: "5px 11px", cursor: "pointer", background: "#fff" }}>
                        บันทึก
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#3f6191", fontWeight: 600 };
const sel: React.CSSProperties = { padding: "8px 10px", border: "1px solid #d7e0ec", borderRadius: 8, fontSize: 13, background: "#fff", minWidth: 180 };
const th: React.CSSProperties = { padding: "8px 10px" };
