import Link from "next/link";
import {
  phases,
  traceChain,
  outcomeChips,
  type Module,
  type PhaseKey,
} from "@/lib/blueprint";

const bandClass: Record<PhaseKey, string> = {
  p1: "b1", p2: "b2", p3: "b3", p4: "b4", plat: "b5",
};
const numClass: Record<PhaseKey, string> = {
  p1: "n1", p2: "n2", p3: "n3", p4: "n4", plat: "n5",
};
const listClass: Record<PhaseKey, string> = {
  p1: "l1", p2: "l2", p3: "l3", p4: "l4", plat: "l5",
};

function Card({ module, phaseKey }: { module: Module; phaseKey: PhaseKey }) {
  return (
    <Link href={`/process/${module.id}`} className="card">
      <div className="ch">
        <div className={`num ${numClass[phaseKey]}`}>{module.no}</div>
        <div>
          <div className="ct">
            {module.title} {module.star && <span className="star">★</span>}
          </div>
          <div className="cs">{module.subtitle}</div>
        </div>
        <div className="code">{module.code}</div>
      </div>
      <ul className={listClass[phaseKey]}>
        {module.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      {module.output && (
        <div className="out">
          <b>Output:</b> {module.output}
        </div>
      )}
    </Link>
  );
}

export default function Home() {
  return (
    <div className="wrap">
      {/* App bar */}
      <div className="appbar">
        <div className="brand">
          <span className="logo">🛡️</span>
          <span>ISMS-Lite · มโหฬาร</span>
        </div>
        <Link href="/login" className="btn-google">
          <span aria-hidden>🔐</span> เข้าสู่ระบบด้วย Google
        </Link>
      </div>

      {/* Header */}
      <header className="hd">
        <div className="shield">🛡️</div>
        <div>
          <div className="kick">ISO/IEC 27001:2022 · YEAR-ONE JOURNEY · MVP 1.0</div>
          <h1>ศูนย์จัดการเอกสารและกระบวนการ ISMS — เตรียมพร้อมสู่การรับรอง</h1>
          <div className="sub">
            เส้นทางการจัดทำ ดำเนินการ ตรวจประเมิน และเตรียมความพร้อมสู่การรับรอง ISMS
            ทั้งระบบ · ขับเคลื่อนด้วย Traceability · Evidence · Gate Explainability
          </div>
        </div>
        <div className="tags">
          <div className="tag">20 เมนู (Y01–Y20)</div>
          <div className="tag">18 ขั้นตอน</div>
          <div className="tag solid">4 PHASES + PLATFORM</div>
        </div>
      </header>

      {/* Phases */}
      {phases.map((phase, idx) => (
        <div key={phase.key}>
          <div className="row">
            <div className={`band ${bandClass[phase.key]}`}>
              <div className="no">{phase.no}</div>
              <div className="th">{phase.thTitle}</div>
              <div className="en">{phase.enTitle}</div>
              <div className="note">{phase.note}</div>
            </div>
            <div className="cards">
              {phase.modules.map((m) => (
                <Card key={m.id} module={m} phaseKey={phase.key} />
              ))}
            </div>
          </div>
          {idx < phases.length - 1 && <div className="arrow">▼</div>}
        </div>
      ))}

      {/* Traceability */}
      <section className="trace">
        <h3>Traceability Chain — ห่วงโซ่ที่เชื่อมโยงทุกโมดูลเข้าสู่หลักฐานตรวจสอบย้อนกลับ</h3>
        <p>
          ความต้องการหลัก: Forward &amp; Backward Trace · Trace View ภายใน 3 คลิก ·
          Impact Analysis เมื่อแก้ไข · Orphan Detection (Control ไม่มี Risk / Risk ไม่มี
          Treatment / Control ไม่มี Evidence)
        </p>
        <div className="chain">
          {traceChain.map((node, i) => (
            <span key={node} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <span className={`node ${i === 0 || i === traceChain.length - 1 ? "k" : ""}`}>
                {node}
              </span>
              {i < traceChain.length - 1 && <span className="sep">▶</span>}
            </span>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="ft">
        <h2>ผลลัพธ์ปลายทาง: ISMS พร้อมรับการตรวจรับรองครั้งแรก</h2>
        <div className="d">
          ระบบบริหารจัดการงานจริง มี Traceability ครบห่วงโซ่ · หลักฐานเชื่อถือได้และตรึงเวอร์ชัน ·
          ผ่าน Internal Audit และ Management Review · อธิบาย Gate ได้ทุกจุดสถานะ
        </div>
        <div className="chips">
          {outcomeChips.map((c) => (
            <div className="chip" key={c.s}>
              <div className="t">{c.t}</div>
              <div className="s">{c.s}</div>
            </div>
          ))}
        </div>
        <div className="fine">
          การจัดสิทธิ์การรับรองเป็นอำนาจของ Certification Body · แพลตฟอร์มทำหน้าที่เตรียมความพร้อมและรวบรวมหลักฐาน
        </div>
      </footer>
    </div>
  );
}
