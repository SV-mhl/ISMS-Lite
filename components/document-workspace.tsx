"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "./status-badge";

export type DocRow = {
  id: string;
  title: string;
  status: string;
  versionNo: number | null;
  fileName: string | null;
  updatedAt: string; // ISO
  uploadedByName: string | null;
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DocumentWorkspace({
  slug,
  documents,
}: {
  slug: string;
  documents: DocRow[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const versionInputRef = useRef<HTMLInputElement>(null);
  const [versionDocId, setVersionDocId] = useState<string | null>(null);

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !file) {
      setError("กรุณาระบุชื่อเอกสารและแนบไฟล์");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("file", file);
      const res = await fetch(`/api/processes/${slug}/documents`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "อัปโหลดไม่สำเร็จ");
      setTitle("");
      setFile(null);
      (document.getElementById("new-doc-file") as HTMLInputElement).value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  async function onVersionPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !versionDocId) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch(`/api/documents/${versionDocId}/versions`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "อัปโหลดเวอร์ชันใหม่ไม่สำเร็จ");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
      setVersionDocId(null);
      if (versionInputRef.current) versionInputRef.current.value = "";
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* New document check-in */}
      <form
        onSubmit={submitNew}
        style={{
          background: "#fff",
          border: "1px solid #dbe6f4",
          borderRadius: 12,
          padding: "16px 18px",
          marginBottom: 18,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, color: "#0d356f", width: "100%" }}>
          เช็คอินเอกสารใหม่
        </div>
        <input
          type="text"
          placeholder="ชื่อเอกสาร เช่น นโยบายความมั่นคงปลอดภัยสารสนเทศ"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            flex: "1 1 260px",
            padding: "9px 12px",
            border: "1px solid #d7e0ec",
            borderRadius: 8,
            fontSize: 13.5,
          }}
        />
        <input
          id="new-doc-file"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ fontSize: 13, flex: "1 1 200px" }}
        />
        <button
          type="submit"
          disabled={busy}
          className="btn-google"
          style={{ marginLeft: 0, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? "กำลังอัปโหลด…" : "⬆️ เช็คอิน"}
        </button>
        {error && (
          <div style={{ width: "100%", color: "#b23b3b", fontSize: 12.5 }}>{error}</div>
        )}
      </form>

      {/* Hidden input for per-row new version */}
      <input
        ref={versionInputRef}
        type="file"
        style={{ display: "none" }}
        onChange={onVersionPicked}
      />

      {/* Document list */}
      {documents.length === 0 ? (
        <div
          style={{
            background: "#f7fafd",
            border: "1px dashed #cfe0f4",
            borderRadius: 12,
            padding: "24px",
            textAlign: "center",
            color: "#7189a8",
            fontSize: 13,
          }}
        >
          ยังไม่มีเอกสารในกระบวนการนี้ — เริ่มด้วยการเช็คอินด้านบน
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#7189a8", fontSize: 11.5 }}>
                <th style={{ padding: "8px 10px" }}>เอกสาร</th>
                <th style={{ padding: "8px 10px" }}>เวอร์ชัน</th>
                <th style={{ padding: "8px 10px" }}>สถานะ</th>
                <th style={{ padding: "8px 10px" }}>อัปเดต</th>
                <th style={{ padding: "8px 10px" }}></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} style={{ borderTop: "1px solid #eef3fa" }}>
                  <td style={{ padding: "10px" }}>
                    <div style={{ fontWeight: 600, color: "#12233f" }}>{d.title}</div>
                    <div style={{ fontSize: 11, color: "#9db0c8" }}>
                      {d.fileName ?? "—"} · {d.uploadedByName ?? "—"}
                    </div>
                  </td>
                  <td style={{ padding: "10px", color: "#5d7791" }}>
                    v{d.versionNo ?? "—"}
                  </td>
                  <td style={{ padding: "10px" }}>
                    <StatusBadge status={d.status} />
                  </td>
                  <td style={{ padding: "10px", color: "#5d7791", whiteSpace: "nowrap" }}>
                    {fmtDate(d.updatedAt)}
                  </td>
                  <td style={{ padding: "10px", textAlign: "right" }}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setVersionDocId(d.id);
                        versionInputRef.current?.click();
                      }}
                      style={{
                        fontSize: 12,
                        color: "#1a4c9e",
                        background: "none",
                        border: "1px solid #cfe0f4",
                        borderRadius: 7,
                        padding: "5px 10px",
                        cursor: "pointer",
                      }}
                    >
                      อัปเวอร์ชันใหม่
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
