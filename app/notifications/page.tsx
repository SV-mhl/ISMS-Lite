import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AppBar from "@/components/appbar";
import NotificationsAutoRead from "@/components/notifications-auto-read";
import { listNotifications } from "@/lib/notify";

const TYPE_ICON: Record<string, string> = {
  review_requested: "🔍",
  approval_requested: "✅",
  reviewed: "👀",
  approved: "🎉",
  rejected: "↩️",
  published: "📢",
};

function fmtDate(d: Date): string {
  return new Date(d).toLocaleString("th-TH", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const items = await listNotifications(session.user.id);
  const hasUnread = items.some((i) => !i.isRead);

  return (
    <div className="wrap">
      <AppBar />
      <NotificationsAutoRead hasUnread={hasUnread} />

      <div style={{ padding: "18px 20px", maxWidth: 760 }}>
        <h1 style={{ fontSize: 18, color: "#0d356f", fontWeight: 700, marginBottom: 4 }}>
          🔔 การแจ้งเตือน
        </h1>
        <p style={{ fontSize: 12.5, color: "#7189a8", marginBottom: 16 }}>
          เหตุการณ์ของเอกสารที่เกี่ยวข้องกับคุณ
        </p>

        {items.length === 0 ? (
          <div style={{
            background: "#f7fafd", border: "1px dashed #cfe0f4", borderRadius: 12,
            padding: 24, textAlign: "center", color: "#7189a8", fontSize: 13,
          }}>
            ยังไม่มีการแจ้งเตือน
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((n) => {
              const inner = (
                <div style={{
                  display: "flex", gap: 12, alignItems: "flex-start",
                  background: n.isRead ? "#fff" : "#f2f7fd",
                  border: "1px solid " + (n.isRead ? "#eef3fa" : "#cfe0f4"),
                  borderRadius: 10, padding: "12px 14px",
                }}>
                  <span style={{ fontSize: 18, lineHeight: 1.2 }}>{TYPE_ICON[n.type] ?? "🔔"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "#12233f" }}>{n.title}</div>
                    {n.body && <div style={{ fontSize: 12.5, color: "#3c536f", marginTop: 2, lineHeight: 1.6 }}>{n.body}</div>}
                    <div style={{ fontSize: 11, color: "#9db0c8", marginTop: 4 }}>{fmtDate(n.createdAt)}</div>
                  </div>
                  {!n.isRead && (
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: "#e0492b", marginTop: 5, flex: "none" }} />
                  )}
                </div>
              );
              return n.processSlug ? (
                <Link key={n.id} href={`/process/${n.processSlug}`} style={{ textDecoration: "none" }}>
                  {inner}
                </Link>
              ) : (
                <div key={n.id}>{inner}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
