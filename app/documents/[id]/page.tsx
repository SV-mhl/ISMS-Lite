import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import AppBar from "@/components/appbar";
import StatusBadge from "@/components/status-badge";
import Timeline from "@/components/timeline";
import { getDocumentDetail } from "@/lib/documents";
import { listDocumentEvents } from "@/lib/events";

function fmt(d: Date): string {
  return new Date(d).toLocaleString("th-TH", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtSize(n: number | null): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const doc = await getDocumentDetail(id);
  if (!doc) notFound();

  const events = await listDocumentEvents(id);
  const user = session.user;
  const canDownload =
    doc.status === "published" ||
    user.role === "admin" ||
    [doc.createdBy, doc.reviewerId, doc.approverId].includes(user.id);

  return (
    <div className="wrap">
      <AppBar />
      <div style={{ padding: "18px 20px", maxWidth: 860 }}>
        <Link href={`/process/${doc.processSlug}`} style={{ fontSize: 12.5, color: "#3f6191", fontWeight: 600 }}>
          ← {doc.processTitle}
        </Link>

        <div className="card" style={{ marginTop: 14, padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#12233f" }}>{doc.title}</div>
              <div style={{ marginTop: 6 }}><StatusBadge status={doc.status} /></div>
            </div>
            {canDownload && doc.docKind === "url" && doc.externalUrl && (
              <a
                href={doc.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-google"
                style={{ marginLeft: 0, borderColor: "#3f6191", color: "#3f6191" }}
              >
                🔗 เปิดลิงก์
              </a>
            )}
            {canDownload && doc.docKind !== "url" && (
              <a
                href={`/api/documents/${doc.id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-google"
                style={{ marginLeft: 0, borderColor: "#0e8577", color: "#0e8577" }}
              >
                ⬇︎ ดาวน์โหลด PDF
              </a>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16, marginTop: 16 }}>
          {/* Versions */}
          <div className="card" style={{ padding: "16px 18px" }}>
            <h2 style={{ fontSize: 14, color: "#0d356f", fontWeight: 700, marginBottom: 10 }}>เวอร์ชัน</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {doc.versions.map((v) => (
                <div key={v.versionNo} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12.5 }}>
                  <span style={{ fontWeight: 700, color: v.isCurrent ? "#178048" : "#7189a8", minWidth: 34 }}>
                    v{v.versionLabel}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#12233f" }}>
                      {v.docKind === "url" ? "🔗 " : ""}
                      {v.fileName}
                    </div>
                    <div style={{ fontSize: 11, color: "#9db0c8" }}>
                      {v.uploadedByName ?? "—"} · {fmt(v.uploadedAt)}
                      {v.docKind !== "url" && ` · ${fmtSize(v.sizeBytes)}`}
                      {v.isCurrent && " · ปัจจุบัน"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="card" style={{ padding: "16px 18px" }}>
            <h2 style={{ fontSize: 14, color: "#0d356f", fontWeight: 700, marginBottom: 12 }}>ประวัติเหตุการณ์</h2>
            <Timeline entries={events} />
          </div>
        </div>
      </div>
    </div>
  );
}
