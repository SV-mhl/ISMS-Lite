import Link from "next/link";
import { auth, signOut } from "@/auth";
import AdminBootstrapButton from "@/components/admin-bootstrap-button";
import { countInboxTasks } from "@/lib/inbox";
import { countUnread } from "@/lib/notify";
import { canManage } from "@/lib/policy";

export default async function AppBar() {
  const session = await auth();
  const user = session?.user;
  const inboxCount = user ? await countInboxTasks(user.id) : 0;
  const unreadCount = user ? await countUnread(user.id) : 0;

  return (
    <div className="appbar">
      <Link href="/" className="brand" style={{ textDecoration: "none" }}>
        <span className="logo">🛡️</span>
        <span>ISMS-Lite · มโหฬาร</span>
      </Link>

      {user ? (
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href="/dashboard" style={{ textDecoration: "none", fontSize: 13, fontWeight: 600, color: "#3f6191" }}>
            📊 แดชบอร์ด
          </Link>
          <Link href="/calendar" style={{ textDecoration: "none", fontSize: 13, fontWeight: 600, color: "#3f6191" }}>
            📅 ปฏิทิน ISO
          </Link>
          {canManage(user.role) && (
            <Link href="/settings/assignees" style={{ textDecoration: "none", fontSize: 13, fontWeight: 600, color: "#3f6191" }}>
              ⚙ ผู้ตรวจ/อนุมัติ
            </Link>
          )}
          <Link href="/inbox" style={{ position: "relative", textDecoration: "none", fontSize: 13, fontWeight: 600, color: "#3f6191" }}>
            📥 งานของฉัน
            {inboxCount > 0 && (
              <span style={{
                position: "absolute", top: -8, right: -14, background: "#e0492b", color: "#fff",
                fontSize: 10, fontWeight: 700, minWidth: 17, height: 17, borderRadius: 9,
                display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
              }}>
                {inboxCount}
              </span>
            )}
          </Link>
          <Link href="/notifications" style={{ position: "relative", textDecoration: "none", fontSize: 17 }} title="การแจ้งเตือน">
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: -6, right: -12, background: "#e0492b", color: "#fff",
                fontSize: 10, fontWeight: 700, minWidth: 17, height: 17, borderRadius: 9,
                display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
              }}>
                {unreadCount}
              </span>
            )}
          </Link>
          {user.role === "admin" && <AdminBootstrapButton />}
          <span style={{ fontSize: 13, color: "#2f4f7a", fontWeight: 600 }}>
            {user.name ?? user.email}
            {user.role === "admin" && (
              <span
                style={{
                  marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#fff",
                  background: "#178048", padding: "2px 7px", borderRadius: 6,
                }}
              >
                ADMIN
              </span>
            )}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className="btn-google" style={{ marginLeft: 0 }}>
              ออกจากระบบ
            </button>
          </form>
        </div>
      ) : (
        <Link href="/login" className="btn-google">
          <span aria-hidden>🔐</span> เข้าสู่ระบบด้วย Google
        </Link>
      )}
    </div>
  );
}
