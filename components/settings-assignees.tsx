"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type UserOpt = { id: string; name: string | null; email: string };
export type ProcRow = {
  id: string; code: string; slug: string; title: string;
  reviewerId: string | null; approverId: string | null;
};
export type AuditEvent = {
  id: string; action: string; actorName: string | null; processCode: string | null;
  metadata: unknown; createdAt: string;
};

const FLOW_TH: Record<string, string> = { reviewer: "ผู้ตรวจ", approver: "ผู้อนุมัติ" };

export default function SettingsAssignees({
  processes,
  users,
  auditEvents,
}: {
  processes: ProcRow[];
  users: UserOpt[];
  auditEvents: AuditEvent[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  const [bulkR, setBulkR] = useState("");
  const [bulkA, setBulkA] = useState("");
  const bulkSod = !!bulkR && !!bulkA && bulkR === bulkA;

  const [rows, setRows] = useState<Record<string, { r: string; a: string }>>(
    Object.fromEntries(processes.map((p) => [p.id, { r: p.reviewerId ?? "", a: p.approverId ?? "" }])),
  );

  // Re-sync row selections with server data after a save (router.refresh gives
  // a fresh `processes` reference) so dropdowns/badges reflect what was saved.
  useEffect(() => {
    setRows(Object.fromEntries(processes.map((p) => [p.id, { r: p.reviewerId ?? "", a: p.approverId ?? "" }])));
  }, [processes]);

  const uname = (id: string | null | undefined) => {
    if (!id) return "— ไม่กำหนด —";
    const u = users.find((x) => x.id === id);
    return u ? (u.name ?? u.email) : "(ไม่พบผู้ใช้)";
  };

  // Coverage from saved server data (QW2/QW3 summary)
  const cov = useMemo(() => {
    let rv = 0, ap = 0; const missR: string[] = [], missA: string[] = [], sod: string[] = [];
    for (const p of processes) {
      if (p.reviewerId) rv++; else missR.push(p.code);
      if (p.approverId) ap++; else missA.push(p.code);
      if (p.reviewerId && p.approverId && p.reviewerId === p.approverId) sod.push(p.code);
    }
    return { rv, ap, total: processes.length, missR, missA, sod };
  }, [processes]);

  async function applyAll() {
    if (bulkSod) { setMsg("ผู้ตรวจและผู้อนุมัติต้องเป็นคนละคน"); return; }
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
    const st = rows[p.id];
    if (st.r && st.a && st.r === st.a) { setMsg(`${p.code}: ผู้ตรวจและผู้อนุมัติต้องเป็นคนละคน`); return; }
    setBusy(true); setMsg(null);
    try {
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

  function fmtEvent(e: AuditEvent): string {
    const m = (e.metadata ?? {}) as Record<string, unknown>;
    if (e.action === "assignee_bulk_set") {
      return `ตั้งค่าทุกกระบวนการ (${m.count ?? ""}): ผู้ตรวจ=${uname(m.reviewerId as string)}, ผู้อนุมัติ=${uname(m.approverId as string)}`;
    }
    const role = FLOW_TH[String(m.flowRole)] ?? String(m.flowRole);
    return `${e.processCode ?? ""} เปลี่ยน${role}: ${uname(m.fromUserId as string)} → ${uname(m.toUserId as string)}`;
  }

  return (
    <div style={{ maxWidth: 940 }}>
      {msg && <div style={{ fontSize: 12.5, color: "#178048", marginBottom: 10 }}>{msg}</div>}

      {/* Governance summary (QW2 + QW3) */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <Chip label="ผู้ตรวจ" value={`${cov.rv}/${cov.total}`} ok={cov.rv === cov.total} />
        <Chip label="ผู้อนุมัติ" value={`${cov.ap}/${cov.total}`} ok={cov.ap === cov.total} />
        <Chip label="แยกหน้าที่ผิด" value={String(cov.sod.length)} ok={cov.sod.length === 0} danger />
      </div>
      {(cov.missA.length > 0 || cov.sod.length > 0) && (
        <div style={{ fontSize: 12, color: "#8a6d1f", background: "#fff8e6", border: "1px solid #f0dca0", borderRadius: 8, padding: "8px 12px", marginBottom: 14, lineHeight: 1.6 }}>
          {cov.missA.length > 0 && <div>⚠️ ยังไม่มีผู้อนุมัติ: {cov.missA.join(" · ")} ({cov.missA.length})</div>}
          {cov.missR.length > 0 && <div>⚠️ ยังไม่มีผู้ตรวจ: {cov.missR.join(" · ")} ({cov.missR.length})</div>}
          {cov.sod.length > 0 && <div style={{ color: "#b23b3b" }}>⛔ ผู้ตรวจ=ผู้อนุมัติ: {cov.sod.join(" · ")}</div>}
        </div>
      )}

      {/* Bulk */}
      <div style={{ background: "#eef4fc", border: "1px solid #cfe0f4", borderRadius: 12, padding: "16px 18px", marginBottom: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#0d356f", marginBottom: 10 }}>
          ตั้งค่าเริ่มต้นให้ <u>ทุกกระบวนการ</u> (18) พร้อมกันทั้งหมด
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={lbl}>ผู้ตรวจเริ่มต้น
            <select value={bulkR} onChange={(e) => setBulkR(e.target.value)} style={sel}>{opts}</select>
          </label>
          <label style={lbl}>ผู้อนุมัติเริ่มต้น
            <select value={bulkA} onChange={(e) => setBulkA(e.target.value)} style={sel}>{opts}</select>
          </label>
          <button type="button" onClick={applyAll} disabled={busy || bulkSod} className="btn-google" style={{ marginLeft: 0, opacity: bulkSod ? 0.5 : 1 }}>
            {busy ? "กำลังบันทึก…" : "ใช้กับทุกกระบวนการ"}
          </button>
        </div>
        {bulkSod && <div style={{ color: "#b23b3b", fontSize: 12, marginTop: 8 }}>⛔ ผู้ตรวจและผู้อนุมัติต้องเป็นคนละคน</div>}
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
              const sod = !!st.r && !!st.a && st.r === st.a;
              return (
                <tr key={p.id} style={{ borderTop: "1px solid #eef3fa", background: sod ? "#fdf4f4" : undefined }}>
                  <td style={{ padding: "8px 10px" }}>
                    <span style={{ fontWeight: 700, color: "#3f6191" }}>{p.code}</span>{" "}
                    <span style={{ color: "#12233f" }}>{p.title}</span>
                    {sod && <span style={{ marginLeft: 6, fontSize: 10.5, color: "#b23b3b" }}>⛔ ตรวจ=อนุมัติ</span>}
                    {!st.a && <span style={{ marginLeft: 6, fontSize: 10.5, color: "#b5730f" }}>⚠️ ไม่มีผู้อนุมัติ</span>}
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <select value={st.r} onChange={(e) => setRows((s) => ({ ...s, [p.id]: { ...s[p.id], r: e.target.value } }))} style={sel}>{opts}</select>
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <select value={st.a} onChange={(e) => setRows((s) => ({ ...s, [p.id]: { ...s[p.id], a: e.target.value } }))} style={sel}>{opts}</select>
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    {dirty && (
                      <button type="button" onClick={() => saveOne(p)} disabled={busy || sod}
                        style={{ fontSize: 12, color: sod ? "#b0b8c4" : "#1a4c9e", border: "1px solid #cfe0f4", borderRadius: 7, padding: "5px 11px", cursor: sod ? "not-allowed" : "pointer", background: "#fff" }}>
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

      {/* Audit trail (QW1) */}
      <button type="button" onClick={() => setShowAudit((v) => !v)}
        style={{ marginTop: 18, background: "none", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 700, color: "#0d356f" }}>
        {showAudit ? "▾" : "▸"} ประวัติการมอบหมาย (Audit) · {auditEvents.length} รายการล่าสุด
      </button>
      {showAudit && (
        <div style={{ marginTop: 8, borderLeft: "2px solid #e2eaf5", paddingLeft: 14 }}>
          {auditEvents.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "#9db0c8" }}>ยังไม่มีประวัติ</div>
          ) : auditEvents.map((e) => (
            <div key={e.id} style={{ fontSize: 12.5, color: "#3c536f", marginBottom: 7, lineHeight: 1.5 }}>
              • {fmtEvent(e)}
              <div style={{ fontSize: 11, color: "#9db0c8" }}>
                {e.actorName ?? "ระบบ"} · {new Date(e.createdAt).toLocaleString("th-TH", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ label, value, ok, danger }: { label: string; value: string; ok: boolean; danger?: boolean }) {
  const c = ok ? { bg: "#e6f6ec", fg: "#178048" } : danger ? { bg: "#fdeeee", fg: "#b23b3b" } : { bg: "#fff3e0", fg: "#b5730f" };
  return (
    <span style={{ background: c.bg, color: c.fg, borderRadius: 20, padding: "6px 14px", fontSize: 12.5, fontWeight: 700 }}>
      {label} {value} {ok ? "✓" : "!"}
    </span>
  );
}

const lbl: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#3f6191", fontWeight: 600 };
const sel: React.CSSProperties = { padding: "8px 10px", border: "1px solid #d7e0ec", borderRadius: 8, fontSize: 13, background: "#fff", minWidth: 180 };
const th: React.CSSProperties = { padding: "8px 10px" };
