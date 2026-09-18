import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function AppBar() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="appbar">
      <Link href="/" className="brand" style={{ textDecoration: "none" }}>
        <span className="logo">🛡️</span>
        <span>ISMS-Lite · มโหฬาร</span>
      </Link>

      {user ? (
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
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
