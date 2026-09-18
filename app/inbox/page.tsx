import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AppBar from "@/components/appbar";
import { listInboxTasks } from "@/lib/inbox";

function fmtDate(d: Date): string {
  return d.toLocaleString("th-TH", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default async function InboxPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tasks = await listInboxTasks(session.user.id);

  return (
    <div className="wrap">
      <AppBar />
      <div style={{ padding: "18px 20px" }}>
        <Link href="/" style={{ fontSize: 12.5, color: "#3f6191", fontWeight: 600 }}>
          ← กลับสู่แผนที่กระบวนการ
        </Link>
        <h1 style={{ fontSize: 20, color: "#0d356f", fontWeight: 700, margin: "14px 0 4px" }}>
          งานของฉัน (Task Inbox)
        </h1>
        <p style={{ fontSize: 13, color: "#5d7791", marginBottom: 18 }}>
          รายการเอกสารที่รอให้คุณ <b>ตรวจ</b> หรือ <b>อนุมัติ</b>
        </p>

        {tasks.length === 0 ? (
          <div style={{ background: "#f7fafd", border: "1px dashed #cfe0f4", borderRadius: 12, padding: 28, textAlign: "center", color: "#7189a8", fontSize: 13.5, maxWidth: 720 }}>
            🎉 ไม่มีงานค้าง — คุณเคลียร์งานหมดแล้ว
          </div>
        ) : (
          <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 10 }}>
            {tasks.map((t) => (
              <Link key={t.taskId} href={`/process/${t.processSlug}`}
                style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #dbe6f4", borderRadius: 12, padding: "14px 16px", textDecoration: "none" }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, whiteSpace: "nowrap",
                  background: t.taskType === "review" ? "#fff3e0" : "#e7f0fd",
                  color: t.taskType === "review" ? "#b5730f" : "#1a4c9e",
                }}>
                  {t.taskType === "review" ? "รอตรวจ" : "รออนุมัติ"}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "#12233f", fontSize: 14 }}>{t.documentTitle}</div>
                  <div style={{ fontSize: 11.5, color: "#9db0c8" }}>{t.processTitle} · {fmtDate(t.createdAt)}</div>
                </div>
                <span style={{ fontSize: 12.5, color: "#1a4c9e", fontWeight: 600, whiteSpace: "nowrap" }}>เปิด →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
