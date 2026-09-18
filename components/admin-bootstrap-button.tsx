"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminBootstrapButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/bootstrap-drive", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "ไม่สำเร็จ");
      setMsg(`สร้างโฟลเดอร์แล้ว (${data.foldersCreated} ใหม่)`);
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="btn-google"
        style={{ marginLeft: 0, fontSize: 12.5, opacity: busy ? 0.6 : 1 }}
        title="สร้างโฟลเดอร์ 18 กระบวนการใน Shared Drive"
      >
        {busy ? "กำลังตั้งค่า…" : "⚙︎ ตั้งค่าโฟลเดอร์ Drive"}
      </button>
      {msg && <span style={{ fontSize: 11.5, color: "#5d7791" }}>{msg}</span>}
    </span>
  );
}
