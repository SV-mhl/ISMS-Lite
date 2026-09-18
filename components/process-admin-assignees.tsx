"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserOption } from "./document-workspace";

export default function ProcessAdminAssignees({
  slug,
  users,
  defaults,
}: {
  slug: string;
  users: UserOption[];
  defaults: { reviewerId: string | null; approverId: string | null };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reviewerId, setReviewerId] = useState(defaults.reviewerId ?? "");
  const [approverId, setApproverId] = useState(defaults.approverId ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/processes/${slug}/assignees`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerId: reviewerId || null, approverId: approverId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      setMsg("บันทึกค่าเริ่มต้นแล้ว");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginBottom: 14, maxWidth: 980 }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        style={{ fontSize: 12.5, color: "#3f6191", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        ⚙︎ ผู้ตรวจ/ผู้อนุมัติเริ่มต้นของกระบวนการนี้ (แอดมิน) {open ? "▲" : "▼"}
      </button>
      {open && (
        <div style={{ background: "#fff", border: "1px solid #dbe6f4", borderRadius: 12, padding: "14px 16px", marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#3f6191", marginBottom: 4 }}>ผู้ตรวจเริ่มต้น</label>
            <select value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} style={selStyle}>
              <option value="">— ไม่กำหนด —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name ?? u.email}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#3f6191", marginBottom: 4 }}>ผู้อนุมัติเริ่มต้น</label>
            <select value={approverId} onChange={(e) => setApproverId(e.target.value)} style={selStyle}>
              <option value="">— ไม่กำหนด —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name ?? u.email}</option>)}
            </select>
          </div>
          <button type="button" onClick={save} disabled={busy} className="btn-google" style={{ marginLeft: 0, opacity: busy ? 0.6 : 1 }}>
            {busy ? "กำลังบันทึก…" : "บันทึก"}
          </button>
          {msg && <span style={{ fontSize: 11.5, color: "#5d7791" }}>{msg}</span>}
        </div>
      )}
    </div>
  );
}

const selStyle: React.CSSProperties = {
  padding: "8px 10px", border: "1px solid #d7e0ec", borderRadius: 8, fontSize: 13, background: "#fff", minWidth: 180,
};
