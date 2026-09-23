import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AppBar from "@/components/appbar";
import { getStatusCounts, getProcessProgress } from "@/lib/dashboard";
import { countInboxTasks } from "@/lib/inbox";
import { getAssignmentCoverage } from "@/lib/assignees";
import { canManage } from "@/lib/policy";
import { STATUS_META } from "@/components/status-badge";

const PHASE_COLOR: Record<string, string> = {
  p1: "#1e63c9", p2: "#2c4ea6", p3: "#12a394", p4: "#22a05c",
};

function Tile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #dbe6f4", borderRadius: 12,
      padding: "14px 16px", minWidth: 0,
    }}>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#5d7791", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [counts, progress, myPending] = await Promise.all([
    getStatusCounts(),
    getProcessProgress(),
    countInboxTasks(session.user.id),
  ]);

  const withDocs = progress.filter((p) => p.total > 0).length;
  const withPublished = progress.filter((p) => p.published > 0).length;

  const isManager = canManage(session.user.role);
  const cov = isManager ? await getAssignmentCoverage() : null;

  return (
    <div className="wrap">
      <AppBar />
      <div style={{ padding: "18px 20px" }}>
        <h1 style={{ fontSize: 18, color: "#0d356f", fontWeight: 700 }}>แดชบอร์ด</h1>
        <p style={{ fontSize: 12.5, color: "#7189a8", margin: "3px 0 16px" }}>
          ภาพรวมความคืบหน้าการจัดทำเอกสาร ISMS
        </p>

        {/* Status tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12 }}>
          <Tile label="เอกสารทั้งหมด" value={counts.total} color="#12233f" />
          <Tile label={STATUS_META.draft.label} value={counts.draft} color={STATUS_META.draft.fg} />
          <Tile label={STATUS_META.review.label} value={counts.review} color={STATUS_META.review.fg} />
          <Tile label={STATUS_META.approved.label} value={counts.approved} color={STATUS_META.approved.fg} />
          <Tile label={STATUS_META.published.label} value={counts.published} color={STATUS_META.published.fg} />
        </div>

        {/* Coverage + my tasks */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 12 }}>
          <Tile label="กระบวนการที่มีเอกสารแล้ว (จาก 18)" value={withDocs} color="#1a4c9e" />
          <Tile label="กระบวนการที่มีเอกสารเผยแพร่ (จาก 18)" value={withPublished} color="#178048" />
          <Link href="/inbox" style={{ textDecoration: "none" }}>
            <Tile label="งานค้างของฉัน →" value={myPending} color="#e0492b" />
          </Link>
        </div>

        {/* Governance (admin/manager) — assignment coverage */}
        {cov && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginTop: 12 }}>
            <Link href="/settings/assignees" style={{ textDecoration: "none" }}>
              <Tile label="กระบวนการยังไม่มีผู้อนุมัติ →" value={cov.missingApprover.length} color={cov.missingApprover.length ? "#b5730f" : "#178048"} />
            </Link>
            <Link href="/settings/assignees" style={{ textDecoration: "none" }}>
              <Tile label="กระบวนการยังไม่มีผู้ตรวจ →" value={cov.missingReviewer.length} color={cov.missingReviewer.length ? "#b5730f" : "#178048"} />
            </Link>
            <Link href="/settings/assignees" style={{ textDecoration: "none" }}>
              <Tile label="แยกหน้าที่ผิด (ตรวจ=อนุมัติ) →" value={cov.sodViolations.length} color={cov.sodViolations.length ? "#b23b3b" : "#178048"} />
            </Link>
          </div>
        )}

        {/* Process progress */}
        <h2 style={{ fontSize: 15, color: "#0d356f", fontWeight: 700, margin: "22px 0 12px" }}>
          ความคืบหน้ารายกระบวนการ (18)
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 10 }}>
          {progress.map((p) => {
            const color = PHASE_COLOR[p.phaseKey] ?? "#5d7791";
            const state =
              p.published > 0 ? { t: `เผยแพร่แล้ว ${p.published}`, c: "#178048", bg: "#e6f6ec" }
              : p.total > 0 ? { t: `มีเอกสาร ${p.total}`, c: "#1a4c9e", bg: "#e7f0fd" }
              : { t: "ยังไม่มีเอกสาร", c: "#8a97a8", bg: "#f0f3f7" };
            return (
              <Link key={p.slug} href={`/process/${p.slug}`}
                style={{ textDecoration: "none", background: "#fff", border: "1px solid #dbe6f4",
                  borderLeft: `4px solid ${color}`, borderRadius: 10, padding: "11px 13px", display: "block" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color }}>{p.code}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: state.c, background: state.bg,
                    padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>{state.t}</span>
                </div>
                <div style={{ fontSize: 12.5, color: "#12233f", marginTop: 5, lineHeight: 1.4 }}>{p.title}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
