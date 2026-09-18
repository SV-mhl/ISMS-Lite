import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { error } = await searchParams;

  return (
    <div className="wrap">
      <div className="appbar">
        <Link href="/" className="brand" style={{ textDecoration: "none" }}>
          <span className="logo">🛡️</span>
          <span>ISMS-Lite · มโหฬาร</span>
        </Link>
      </div>

      <div
        style={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          className="card"
          style={{ maxWidth: 420, width: "100%", padding: "28px 26px", textAlign: "center" }}
        >
          <div style={{ fontSize: 40, marginBottom: 8 }}>🛡️</div>
          <h1 style={{ fontSize: 20, color: "#0d356f", fontWeight: 700 }}>
            เข้าสู่ระบบ ISMS-Lite
          </h1>
          <p style={{ fontSize: 13, color: "#5d7791", margin: "8px 0 20px", lineHeight: 1.7 }}>
            เข้าใช้งานด้วยบัญชี Google ขององค์กร
            <br />
            <b>@maholan.co.th</b> เท่านั้น
          </p>

          {error && (
            <p
              style={{
                fontSize: 12.5, color: "#b23b3b", background: "#fdeeee",
                border: "1px solid #f5c9c9", borderRadius: 8, padding: "9px 12px",
                marginBottom: 16, lineHeight: 1.6,
              }}
            >
              {error === "AccessDenied"
                ? "อนุญาตเฉพาะบัญชี @maholan.co.th เท่านั้น"
                : "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่"}
            </p>
          )}

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="btn-google"
              style={{ margin: "0 auto", width: "100%", justifyContent: "center", padding: "12px 16px" }}
            >
              <span aria-hidden>🔐</span> เข้าสู่ระบบด้วย Google
            </button>
          </form>

          <p style={{ fontSize: 11, color: "#9db0c8", marginTop: 16, lineHeight: 1.6 }}>
            การใช้งานถือว่ายอมรับนโยบายความปลอดภัยข้อมูลขององค์กร
          </p>
        </div>
      </div>
    </div>
  );
}
