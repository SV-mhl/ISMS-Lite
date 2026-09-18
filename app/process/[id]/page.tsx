import Link from "next/link";
import { notFound } from "next/navigation";
import { moduleById, allModuleIds, type PhaseKey } from "@/lib/blueprint";

const numClass: Record<PhaseKey, string> = {
  p1: "n1", p2: "n2", p3: "n3", p4: "n4", plat: "n5",
};
const listClass: Record<PhaseKey, string> = {
  p1: "l1", p2: "l2", p3: "l3", p4: "l4", plat: "l5",
};

export function generateStaticParams() {
  return allModuleIds().map((id) => ({ id }));
}

export default async function ProcessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = moduleById[id];
  if (!entry) notFound();

  const { module, phase } = entry;

  return (
    <div className="wrap">
      <div className="appbar">
        <Link href="/" className="brand" style={{ textDecoration: "none" }}>
          <span className="logo">🛡️</span>
          <span>ISMS-Lite · มโหฬาร</span>
        </Link>
        <Link href="/login" className="btn-google">
          <span aria-hidden>🔐</span> เข้าสู่ระบบด้วย Google
        </Link>
      </div>

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

        <div
          style={{
            marginTop: 16,
            maxWidth: 760,
            background: "#eef4fc",
            border: "1px dashed #b9d1ee",
            borderRadius: 12,
            padding: "16px 18px",
            fontSize: 13,
            color: "#2f4f7a",
            lineHeight: 1.7,
          }}
        >
          <b>พื้นที่ทำงานของกระบวนการนี้</b> (เอกสาร · เช็คอิน Drive · workflow ตรวจ–อนุมัติ
          · บันทึกเหตุการณ์) กำลังถูกพัฒนาในขั้นตอนถัดไปของแผนงาน — Step 1 (ฐานข้อมูล),
          Step 3 (เชื่อม Google Drive), Step 4 (workflow)
        </div>
      </div>
    </div>
  );
}
