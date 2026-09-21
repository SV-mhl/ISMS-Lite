import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import AppBar from "@/components/appbar";
import DocumentWorkspace from "@/components/document-workspace";
import ProcessAdminAssignees from "@/components/process-admin-assignees";
import { moduleById, type PhaseKey } from "@/lib/blueprint";
import { getProcessBySlug, listDocuments } from "@/lib/documents";
import { listUsers, getProcessDefaults } from "@/lib/assignees";
import { isDriveConfigured } from "@/lib/google/drive";

const numClass: Record<PhaseKey, string> = {
  p1: "n1", p2: "n2", p3: "n3", p4: "n4", plat: "n5",
};
const listClass: Record<PhaseKey, string> = {
  p1: "l1", p2: "l2", p3: "l3", p4: "l4", plat: "l5",
};

export default async function ProcessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) redirect(`/login`);

  const entry = moduleById[id];
  if (!entry) notFound();

  const { module, phase } = entry;

  const currentUser = {
    id: session.user.id,
    role: session.user.role ?? "member",
  };

  const process = await getProcessBySlug(id);
  const driveOn = isDriveConfigured();
  const [docs, users, defaults] = process
    ? await Promise.all([
        listDocuments(process.id),
        listUsers(),
        getProcessDefaults(process.id),
      ])
    : [[], [], { reviewerId: null, approverId: null }];

  const docRows = docs.map((d) => ({
    id: d.id,
    title: d.title,
    status: d.status,
    versionNo: d.versionNo,
    versionLabel: d.versionLabel,
    fileName: d.fileName,
    updatedAt: d.updatedAt.toISOString(),
    uploadedByName: d.uploadedByName,
    createdBy: d.createdBy,
    reviewerId: d.reviewerId,
    approverId: d.approverId,
    checkedOutBy: d.checkedOutBy,
    inRevision: d.inRevision,
    pendingTask: d.pendingTask,
  }));

  return (
    <div className="wrap">
      <AppBar />

      <div style={{ padding: "18px 20px" }}>
        <Link href="/" style={{ fontSize: 12.5, color: "#3f6191", fontWeight: 600 }}>
          ← กลับสู่แผนที่กระบวนการ
        </Link>

        <div
          className="card"
          style={{ marginTop: 14, maxWidth: 760, padding: "20px 22px" }}
        >
          <div className="ch">
            <div className={`num ${numClass[phase.key]}`}>{module.no}</div>
            <div>
              <div className="ct" style={{ fontSize: 18 }}>
                {module.title} {module.star && <span className="star">★</span>}
              </div>
              <div className="cs">{module.subtitle}</div>
            </div>
            <div className="code">{module.code}</div>
          </div>

          <div style={{ fontSize: 11, color: "#7189a8", fontWeight: 700, letterSpacing: 0.6, marginBottom: 8 }}>
            {phase.no} · {phase.thTitle}
          </div>

          <ul className={listClass[phase.key]}>
            {module.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>

          {module.output && (
            <div className="out" style={{ marginTop: 12 }}>
              <b>Output:</b> {module.output}
            </div>
          )}
        </div>

        <div style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 15, color: "#0d356f", fontWeight: 700, marginBottom: 12 }}>
            เอกสารในกระบวนการนี้
          </h2>

          {!driveOn && (
            <div
              style={{
                maxWidth: 900,
                background: "#fff8e6",
                border: "1px solid #f0dca0",
                borderRadius: 12,
                padding: "12px 16px",
                fontSize: 12.5,
                color: "#8a6d1f",
                lineHeight: 1.7,
                marginBottom: 14,
              }}
            >
              ⚠️ ยังไม่ได้ตั้งค่า Google Drive (Service Account + Shared Drive) — การเช็คอินจะยัง
              ทำงานไม่ได้จนกว่าจะตั้งค่าตาม <b>docs/STEP3-DRIVE-SETUP.md</b>
            </div>
          )}

          {currentUser.role === "admin" && (
            <ProcessAdminAssignees slug={id} users={users} defaults={defaults} />
          )}

          <DocumentWorkspace
            slug={id}
            documents={docRows}
            currentUser={currentUser}
            users={users}
            defaults={defaults}
          />
        </div>
      </div>
    </div>
  );
}
