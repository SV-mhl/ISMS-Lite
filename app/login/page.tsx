import Link from "next/link";

export default function LoginPage() {
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

          <button
            type="button"
            className="btn-google"
            style={{ margin: "0 auto", width: "100%", justifyContent: "center", padding: "12px 16px" }}
            disabled
          >
            <span aria-hidden>🔐</span> เข้าสู่ระบบด้วย Google
          </button>

          <p style={{ fontSize: 11, color: "#9db0c8", marginTop: 16, lineHeight: 1.6 }}>
            การเชื่อมต่อ Google OAuth จริงจะเปิดใช้งานใน Step 2 ของแผนพัฒนา
          </p>
        </div>
      </div>
    </div>
  );
}
