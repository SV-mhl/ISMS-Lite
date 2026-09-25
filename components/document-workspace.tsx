"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StatusBadge from "./status-badge";

export type UserOption = { id: string; name: string | null; email: string };

export type PendingTask = { type: "review" | "approve"; assigneeId: string };

export type DocRow = {
  id: string;
  title: string;
  status: string;
  versionNo: number | null;
  versionLabel: string | null;
  fileName: string | null;
  docKind: "file" | "url";
  externalUrl: string | null;
  updatedAt: string; // ISO
  uploadedByName: string | null;
  createdBy: string;
  reviewerId: string | null;
  approverId: string | null;
  checkedOutBy: string | null;
  inRevision: boolean;
  pendingTask: PendingTask | null;
};

type ActionType = "submit" | "review" | "approve" | "reject" | "publish";

const ENDPOINT: Record<ActionType, (id: string) => string> = {
  submit: (id) => `/api/documents/${id}/submit`,
  review: (id) => `/api/documents/${id}/review-approve`,
  approve: (id) => `/api/documents/${id}/approve`,
  reject: (id) => `/api/documents/${id}/reject`,
  publish: (id) => `/api/documents/${id}/publish`,
};

const ACTION_TITLE: Record<ActionType, string> = {
  submit: "ส่งตรวจเอกสาร",
  review: "ยืนยันตรวจผ่าน",
  approve: "ยืนยันอนุมัติ",
  reject: "ตีกลับเอกสาร",
  publish: "เผยแพร่เอกสาร",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function userName(users: UserOption[], id: string | null): string {
  if (!id) return "—";
  const u = users.find((x) => x.id === id);
  return u ? (u.name ?? u.email) : "—";
}

export default function DocumentWorkspace({
  slug,
  documents,
  currentUser,
  users,
  defaults,
  urlCheckinEnabled = false,
}: {
  slug: string;
  documents: DocRow[];
  currentUser: { id: string; role: "admin" | "isms_manager" | "member" };
  users: UserOption[];
  defaults: { reviewerId: string | null; approverId: string | null };
  urlCheckinEnabled?: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<"file" | "url">("file");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const versionInputRef = useRef<HTMLInputElement>(null);
  const [versionDocId, setVersionDocId] = useState<string | null>(null);

  // check-in revision modal
  const [checkinDoc, setCheckinDoc] = useState<DocRow | null>(null);
  const [checkinFile, setCheckinFile] = useState<File | null>(null);
  const [bump, setBump] = useState<"minor" | "major">("minor");

  // action modal
  const [modal, setModal] = useState<{ doc: DocRow; action: ActionType } | null>(null);
  const [reviewerId, setReviewerId] = useState("");
  const [approverId, setApproverId] = useState("");
  const [comment, setComment] = useState("");
  const [modalErr, setModalErr] = useState<string | null>(null);

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("กรุณาระบุชื่อเอกสาร");
      return;
    }
    if (docType === "url") {
      if (!url.trim()) {
        setError("กรุณาระบุ URL");
        return;
      }
    } else if (!file) {
      setError("กรุณาระบุชื่อเอกสารและแนบไฟล์");
      return;
    }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("docType", docType);
      if (docType === "url") {
        fd.append("url", url.trim());
      } else {
        fd.append("file", file as File);
      }
      const res = await fetch(`/api/processes/${slug}/documents`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "เช็คอินไม่สำเร็จ");
      setTitle("");
      setFile(null);
      setUrl("");
      const el = document.getElementById("new-doc-file") as HTMLInputElement | null;
      if (el) el.value = "";
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
      const res = await fetch(`/api/documents/${versionDocId}/versions`, { method: "POST", body: fd });
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

  async function simplePost(url: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "ดำเนินการไม่สำเร็จ");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  async function doDelete(d: DocRow) {
    if (!window.confirm(`ลบเอกสาร "${d.title}" ?\nไฟล์จะถูกย้ายไปถังขยะของ Drive (กู้คืนได้)`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${d.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "ลบไม่สำเร็จ");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  async function submitCheckin() {
    if (!checkinDoc || !checkinFile) {
      setModalErr("กรุณาแนบไฟล์");
      return;
    }
    setBusy(true);
    setModalErr(null);
    try {
      const fd = new FormData();
      fd.append("file", checkinFile);
      fd.append("bump", bump);
      const res = await fetch(`/api/documents/${checkinDoc.id}/checkin`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "เช็คอินไม่สำเร็จ");
      setCheckinDoc(null);
      setCheckinFile(null);
      setBump("minor");
      router.refresh();
    } catch (err) {
      setModalErr(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  function openModal(doc: DocRow, action: ActionType) {
    setModal({ doc, action });
    setReviewerId(doc.reviewerId ?? defaults.reviewerId ?? "");
    setApproverId(doc.approverId ?? defaults.approverId ?? "");
    setComment("");
    setModalErr(null);
  }

  async function confirmAction() {
    if (!modal) return;
    const { doc, action } = modal;
    setModalErr(null);

    let body: Record<string, unknown> = {};
    if (action === "submit") {
      if (!reviewerId || !approverId) {
        setModalErr("กรุณาเลือกผู้ตรวจและผู้อนุมัติ");
        return;
      }
      body = { reviewerId, approverId };
    } else if (action === "reject") {
      if (!comment.trim()) {
        setModalErr("กรุณาระบุเหตุผลการตีกลับ");
        return;
      }
      body = { comment: comment.trim() };
    } else if (action === "review" || action === "approve") {
      body = { comment: comment.trim() || undefined };
    }

    setBusy(true);
    try {
      const res = await fetch(ENDPOINT[action](doc.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "ดำเนินการไม่สำเร็จ");
      setModal(null);
      router.refresh();
    } catch (err) {
      setModalErr(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  function actionsFor(d: DocRow) {
    const acts: { action: ActionType; label: string; color: string }[] = [];
    const isOwner = d.createdBy === currentUser.id || currentUser.role === "admin";
    if ((d.status === "draft" || d.status === "rejected") && isOwner) {
      acts.push({ action: "submit", label: "ส่งตรวจ", color: "#1a4c9e" });
    }
    if (d.status === "review" && d.pendingTask?.type === "review" && d.pendingTask.assigneeId === currentUser.id) {
      acts.push({ action: "review", label: "ตรวจผ่าน", color: "#178048" });
      acts.push({ action: "reject", label: "ตีกลับ", color: "#b23b3b" });
    }
    if (d.status === "review" && d.pendingTask?.type === "approve" && d.pendingTask.assigneeId === currentUser.id) {
      acts.push({ action: "approve", label: "อนุมัติ", color: "#178048" });
      acts.push({ action: "reject", label: "ตีกลับ", color: "#b23b3b" });
    }
    if (d.status === "approved" && (currentUser.role === "admin" || d.approverId === currentUser.id)) {
      acts.push({ action: "publish", label: "เผยแพร่", color: "#0d356f" });
    }
    return acts;
  }

  return (
    <div style={{ maxWidth: 980 }}>
      {/* New document check-in */}
      <form onSubmit={submitNew} style={cardFormStyle}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#0d356f", width: "100%" }}>
          เช็คอินเอกสารใหม่
        </div>

        {urlCheckinEnabled && (
          <div style={{ display: "flex", gap: 14, fontSize: 12.5, width: "100%" }}>
            <label style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
              <input type="radio" checked={docType === "file"} onChange={() => setDocType("file")} />
              📄 ไฟล์
            </label>
            <label style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
              <input type="radio" checked={docType === "url"} onChange={() => setDocType("url")} />
              🔗 ลิงก์ URL
            </label>
          </div>
        )}

        <input
          type="text"
          placeholder="ชื่อเอกสาร เช่น นโยบายความมั่นคงปลอดภัยสารสนเทศ"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ flex: "1 1 260px", padding: "9px 12px", border: "1px solid #d7e0ec", borderRadius: 8, fontSize: 13.5 }}
        />
        {docType === "url" ? (
          <input
            type="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{ flex: "1 1 260px", padding: "9px 12px", border: "1px solid #d7e0ec", borderRadius: 8, fontSize: 13.5 }}
          />
        ) : (
          <input id="new-doc-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: 13, flex: "1 1 200px" }} />
        )}
        <button type="submit" disabled={busy} className="btn-google" style={{ marginLeft: 0, opacity: busy ? 0.6 : 1 }}>
          {busy ? "กำลังเช็คอิน…" : "⬆️ เช็คอิน"}
        </button>
        {error && <div style={{ width: "100%", color: "#b23b3b", fontSize: 12.5 }}>{error}</div>}
      </form>

      <input ref={versionInputRef} type="file" style={{ display: "none" }} onChange={onVersionPicked} />

      {/* Document list */}
      {documents.length === 0 ? (
        <div style={emptyStyle}>ยังไม่มีเอกสารในกระบวนการนี้ — เริ่มด้วยการเช็คอินด้านบน</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#7189a8", fontSize: 11.5 }}>
                <th style={thStyle}>เอกสาร</th>
                <th style={thStyle}>เวอร์ชัน</th>
                <th style={thStyle}>สถานะ</th>
                <th style={thStyle}>ผู้ตรวจ / ผู้อนุมัติ</th>
                <th style={thStyle}>อัปเดต</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} style={{ borderTop: "1px solid #eef3fa" }}>
                  <td style={{ padding: "10px" }}>
                    <Link href={`/documents/${d.id}`} style={{ fontWeight: 600, color: "#1a4c9e", textDecoration: "none" }}>
                      {d.title}
                    </Link>
                    <div style={{ fontSize: 11, color: "#9db0c8" }}>
                      {d.docKind === "url" ? "🔗 ลิงก์" : (d.fileName ?? "—")} · {d.uploadedByName ?? "—"}
                    </div>
                  </td>
                  <td style={{ padding: "10px", color: "#5d7791", whiteSpace: "nowrap" }}>
                    v{d.versionLabel ?? d.versionNo ?? "—"}
                    {d.inRevision && (
                      <div style={{ fontSize: 10, color: "#b5730f" }}>กำลังแก้ไข</div>
                    )}
                    {d.checkedOutBy && (
                      <div style={{ fontSize: 10, color: "#b23b3b" }}>
                        🔒 {userName(users, d.checkedOutBy)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "10px" }}><StatusBadge status={d.status} /></td>
                  <td style={{ padding: "10px", fontSize: 11.5, color: "#5d7791" }}>
                    {userName(users, d.reviewerId)} / {userName(users, d.approverId)}
                  </td>
                  <td style={{ padding: "10px", color: "#5d7791", whiteSpace: "nowrap" }}>{fmtDate(d.updatedAt)}</td>
                  <td style={{ padding: "10px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {d.versionNo != null &&
                        (d.status === "published" ||
                          currentUser.role === "admin" ||
                          d.createdBy === currentUser.id ||
                          d.reviewerId === currentUser.id ||
                          d.approverId === currentUser.id) &&
                        (d.docKind === "url" ? (
                          d.externalUrl && (
                            <a
                              href={d.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="เปิดลิงก์เอกสาร"
                              style={{ ...actionBtnStyle, textDecoration: "none", borderColor: "#3f6191", color: "#3f6191", display: "inline-block" }}
                            >
                              🔗 เปิดลิงก์
                            </a>
                          )
                        ) : (
                          <a
                            href={`/api/documents/${d.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="ดาวน์โหลดเป็น PDF (มีลายน้ำ)"
                            style={{ ...actionBtnStyle, textDecoration: "none", borderColor: "#0e8577", color: "#0e8577", display: "inline-block" }}
                          >
                            ⬇︎ PDF
                          </a>
                        ))}
                      {actionsFor(d).map((a) => (
                        <button key={a.action} type="button" disabled={busy} onClick={() => openModal(d, a.action)}
                          style={{ ...actionBtnStyle, borderColor: a.color, color: a.color }}>
                          {a.label}
                        </button>
                      ))}
                      {/* check-out published doc for revision (file docs only — pilot scope) */}
                      {d.docKind !== "url" && d.status === "published" && !d.checkedOutBy &&
                        (d.createdBy === currentUser.id || currentUser.role === "admin") && (
                        <button type="button" disabled={busy}
                          onClick={() => simplePost(`/api/documents/${d.id}/checkout`)}
                          style={{ ...actionBtnStyle, borderColor: "#b5730f", color: "#b5730f" }}>
                          เช็คเอาต์แก้ไข
                        </button>
                      )}
                      {/* holder can check-in a new revision or cancel */}
                      {d.checkedOutBy === currentUser.id && (
                        <>
                          <button type="button" disabled={busy}
                            onClick={() => { setCheckinDoc(d); setCheckinFile(null); setBump("minor"); setModalErr(null); }}
                            style={{ ...actionBtnStyle, borderColor: "#178048", color: "#178048" }}>
                            เช็คอินเวอร์ชันใหม่
                          </button>
                          <button type="button" disabled={busy}
                            onClick={() => simplePost(`/api/documents/${d.id}/cancel-checkout`)}
                            style={{ ...actionBtnStyle, borderColor: "#cfe0f4", color: "#5d7791" }}>
                            ยกเลิก
                          </button>
                        </>
                      )}
                      {/* iterate a non-published draft (file docs only — pilot scope) */}
                      {d.docKind !== "url" && d.status !== "published" && !d.checkedOutBy &&
                        (d.createdBy === currentUser.id || currentUser.role === "admin") && (
                        <button type="button" disabled={busy}
                          onClick={() => { setVersionDocId(d.id); versionInputRef.current?.click(); }}
                          style={{ ...actionBtnStyle, borderColor: "#cfe0f4", color: "#5d7791" }}>
                          อัปเวอร์ชัน
                        </button>
                      )}
                      {/* delete a never-published draft */}
                      {d.status === "draft" && !d.inRevision &&
                        (d.createdBy === currentUser.id || currentUser.role === "admin") && (
                        <button type="button" disabled={busy} onClick={() => doDelete(d)}
                          title="ลบเอกสารร่าง (ไฟล์ย้ายไปถังขยะ Drive)"
                          style={{ ...actionBtnStyle, borderColor: "#b23b3b", color: "#b23b3b" }}>
                          🗑 ลบ
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action modal */}
      {modal && (
        <div style={overlayStyle} onClick={() => !busy && setModal(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0d356f", marginBottom: 4 }}>
              {ACTION_TITLE[modal.action]}
            </div>
            <div style={{ fontSize: 12.5, color: "#5d7791", marginBottom: 14 }}>{modal.doc.title}</div>

            {modal.action === "submit" && (
              <>
                <label style={labelStyle}>ผู้ตรวจ (Reviewer)</label>
                <select value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} style={selectStyle}>
                  <option value="">— เลือกผู้ตรวจ —</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name ?? u.email}</option>)}
                </select>
                <label style={labelStyle}>ผู้อนุมัติ (Approver)</label>
                <select value={approverId} onChange={(e) => setApproverId(e.target.value)} style={selectStyle}>
                  <option value="">— เลือกผู้อนุมัติ —</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name ?? u.email}</option>)}
                </select>
              </>
            )}

            {(modal.action === "review" || modal.action === "approve") && (
              <>
                <label style={labelStyle}>ความเห็น (ไม่บังคับ)</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} style={textareaStyle} />
              </>
            )}

            {modal.action === "reject" && (
              <>
                <label style={labelStyle}>เหตุผลการตีกลับ (บังคับ)</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} style={textareaStyle}
                  placeholder="เช่น ต้องแก้หัวข้อ 3.2 ให้ตรงกับ Annex A.5.1" />
              </>
            )}

            {modal.action === "publish" && (
              <div style={{ fontSize: 13, color: "#3c536f", lineHeight: 1.7 }}>
                เมื่อเผยแพร่แล้ว เอกสารจะมีผลบังคับใช้ และผู้มีสิทธิ์จะดาวน์โหลดได้เป็น <b>PDF เท่านั้น</b>
              </div>
            )}

            {modalErr && <div style={{ color: "#b23b3b", fontSize: 12.5, marginTop: 10 }}>{modalErr}</div>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
              <button type="button" disabled={busy} onClick={() => setModal(null)} style={{ ...actionBtnStyle, borderColor: "#d7e0ec", color: "#5d7791", padding: "9px 16px" }}>
                ยกเลิก
              </button>
              <button type="button" disabled={busy} onClick={confirmAction} className="btn-google" style={{ marginLeft: 0, opacity: busy ? 0.6 : 1 }}>
                {busy ? "กำลังดำเนินการ…" : "ยืนยัน"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check-in revision modal */}
      {checkinDoc && (
        <div style={overlayStyle} onClick={() => !busy && setCheckinDoc(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0d356f", marginBottom: 4 }}>
              เช็คอินเวอร์ชันใหม่
            </div>
            <div style={{ fontSize: 12.5, color: "#5d7791", marginBottom: 14 }}>
              {checkinDoc.title} (ปัจจุบัน v{checkinDoc.versionLabel})
            </div>

            <label style={labelStyle}>ระดับการเปลี่ยนแปลง</label>
            <div style={{ display: "flex", gap: 14, fontSize: 13, marginBottom: 4 }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
                <input type="radio" checked={bump === "minor"} onChange={() => setBump("minor")} />
                แก้ไขย่อย (minor → x.{"y+1"})
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
                <input type="radio" checked={bump === "major"} onChange={() => setBump("major")} />
                แก้ไขใหญ่ (major → รุ่นถัดไป .0)
              </label>
            </div>

            <label style={labelStyle}>ไฟล์เวอร์ชันใหม่</label>
            <input type="file" onChange={(e) => setCheckinFile(e.target.files?.[0] ?? null)} style={{ fontSize: 13 }} />

            <div style={{ fontSize: 11.5, color: "#7189a8", marginTop: 10, lineHeight: 1.6 }}>
              เวอร์ชันเดิมที่เผยแพร่ยังดาวน์โหลดได้ระหว่างที่รุ่นใหม่ยังไม่ผ่านอนุมัติ · รุ่นใหม่จะเริ่มที่สถานะ “ร่าง” และต้องเดิน workflow ใหม่
            </div>

            {modalErr && <div style={{ color: "#b23b3b", fontSize: 12.5, marginTop: 10 }}>{modalErr}</div>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
              <button type="button" disabled={busy} onClick={() => setCheckinDoc(null)} style={{ ...actionBtnStyle, borderColor: "#d7e0ec", color: "#5d7791", padding: "9px 16px" }}>
                ยกเลิก
              </button>
              <button type="button" disabled={busy} onClick={submitCheckin} className="btn-google" style={{ marginLeft: 0, opacity: busy ? 0.6 : 1 }}>
                {busy ? "กำลังเช็คอิน…" : "เช็คอิน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const cardFormStyle: React.CSSProperties = {
  background: "#fff", border: "1px solid #dbe6f4", borderRadius: 12, padding: "16px 18px",
  marginBottom: 18, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
};
const emptyStyle: React.CSSProperties = {
  background: "#f7fafd", border: "1px dashed #cfe0f4", borderRadius: 12, padding: "24px",
  textAlign: "center", color: "#7189a8", fontSize: 13,
};
const thStyle: React.CSSProperties = { padding: "8px 10px" };
const actionBtnStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, background: "#fff", border: "1px solid", borderRadius: 7,
  padding: "5px 11px", cursor: "pointer",
};
const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(10,30,60,0.35)", display: "flex",
  alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", zIndex: 50, overflowY: "auto",
};
const modalStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 14, padding: "22px 24px", width: "100%", maxWidth: 440,
  maxHeight: "calc(100vh - 80px)", overflowY: "auto", margin: "auto",
  boxShadow: "0 20px 60px rgba(10,30,60,0.3)",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#3f6191", margin: "10px 0 5px",
};
const selectStyle: React.CSSProperties = {
  width: "100%", padding: "9px 11px", border: "1px solid #d7e0ec", borderRadius: 8, fontSize: 13.5, background: "#fff",
};
const textareaStyle: React.CSSProperties = {
  width: "100%", padding: "9px 11px", border: "1px solid #d7e0ec", borderRadius: 8, fontSize: 13.5, resize: "vertical",
};
