// ============================================================
// ISMS-Lite — Blueprint data (18 process + 3 platform modules)
// Single source of truth for the landing map and process pages.
// Thai content reconstructed from the ISO/IEC 27001:2022 Year-One
// Journey blueprint supplied by Maholan.
// ============================================================

export type PhaseKey = "p1" | "p2" | "p3" | "p4" | "plat";

export type Module = {
  id: string; // route slug, e.g. "y01"
  no: number; // display number 1..21
  code: string; // e.g. "Y01"
  title: string; // Thai title
  subtitle: string; // English caption
  bullets: string[];
  output?: string;
  star?: boolean;
};

export type Phase = {
  key: PhaseKey;
  no: string; // "PHASE 01"
  thTitle: string;
  enTitle: string;
  note: string;
  modules: Module[];
};

export const phases: Phase[] = [
  {
    key: "p1",
    no: "PHASE 01",
    thTitle: "วางรากฐานและกำหนดขอบเขต",
    enTitle: "INITIATE & DEFINE",
    note: "Step 01–05 · Y01–Y04 · เตรียม · ขอบเขต · สินทรัพย์",
    modules: [
      {
        id: "y01", no: 1, code: "Y01",
        title: "เริ่มโครงการและวางแผนโครงการ",
        subtitle: "JOURNEY & PROJECT ORCHESTRATION",
        bullets: [
          "Project Charter · Sponsor · Objective",
          "Team & RACI · Role Assignment",
          "Roadmap 18 Steps + 4 Phase Gates",
        ],
        output: "Charter · Team Register · Roadmap",
      },
      {
        id: "y02", no: 2, code: "Y02",
        title: "บริบท ผู้มีส่วนได้เสีย และขอบเขต",
        subtitle: "CONTEXT · PARTIES · SCOPE",
        bullets: [
          "Internal / External Issues (4.1)",
          "Interested Parties & Requirements (4.2)",
          "Exclusion + Justification",
          "SD-01 วิเคราะห์บริบทองค์กร",
          "SD-02 วิเคราะห์ผู้มีส่วนได้ส่วนเสีย",
        ],
        output: "Approved ISMS Scope Statement",
      },
      {
        id: "y03", no: 3, code: "Y03",
        title: "ประเมิน Gap เริ่มต้น",
        subtitle: "GAP ASSESSMENT WORKSPACE",
        bullets: [
          "Question Bank ตาม Clause 4–10",
          "Annex A 93 Controls Checklist",
          "Auto-generate Remediation Plan",
        ],
        output: "Gap Report · Remediation Plan",
      },
      {
        id: "y04", no: 4, code: "Y04",
        title: "ทะเบียนสินทรัพย์และข้อผูกพัน",
        subtitle: "ASSET & OBLIGATION REGISTERS",
        bullets: [
          "Asset: Info · System · Device · People",
          "Owner · Classification (C-I-A) · Dependency",
          "Legal · Contract · Regulatory Register",
          "QP_02 การบริหารจัดการทรัพย์สิน",
          "QP_15 การติดตามประเมินความสอดคล้องกฎหมายคอมพิวเตอร์",
          "เอกสารขอดูภาพกล้องวงจรปิด (CCTV)",
        ],
        output: "Asset · Legal · Contract Registers",
      },
    ],
  },
  {
    key: "p2",
    no: "PHASE 02",
    thTitle: "ประเมินความเสี่ยงและวางแผนจัดการ",
    enTitle: "ASSESS & PLAN",
    note: "Step 06–08 · Y05–Y06 · RISK-DRIVEN · APPROVED",
    modules: [
      {
        id: "y05a", no: 5, code: "Y05a",
        title: "ระเบียบวิธีและการประเมินความเสี่ยง",
        subtitle: "RISK METHODOLOGY & ASSESSMENT",
        bullets: [
          "เกณฑ์ Likelihood / Impact · Matrix 3×3–5×5",
          "Risk Appetite & Acceptance Criteria (Versioned)",
          "Threat & Vulnerability Library",
          "Risk-01 แผนบริหารความเสี่ยง",
          "Risk-02 Risk Assessment Methodology",
          "Risk-03 Risk Assessment",
          "QP_09 การประเมินความเสี่ยงต่อข้อมูลสารสนเทศ",
        ],
        output: "Risk Register · Risk Matrix",
      },
      {
        id: "y05b", no: 6, code: "Y05b",
        title: "จัดการและยอมรับความเสี่ยง",
        subtitle: "RISK TREATMENT & ACCEPTANCE",
        bullets: [
          "Option: Modify · Retain · Avoid · Share",
          "Treatment Plan · Owner · Due · Budget",
          "Risk-04 Risk Treatment",
        ],
        output: "Treatment Plan · Acceptance Record",
      },
      {
        id: "y06", no: 7, code: "Y06",
        title: "จัดทำ Statement of Applicability",
        subtitle: "RISK-DRIVEN SoA",
        bullets: [
          "Annex A Catalog 93 ข้อ / 4 Themes + Attributes",
          "Map Risk → Control (Many-to-Many)",
          "Applicable / N/A + Justification",
          "SOA (Statement of Applicability)",
        ],
        output: "Approved SoA (Versioned)",
      },
    ],
  },
  {
    key: "p3",
    no: "PHASE 03",
    thTitle: "ดำเนินการปฏิบัติและดำเนินงาน",
    enTitle: "IMPLEMENT & OPERATE",
    note: "Step 09–13 · Y07–Y12 · DOCUMENTED · EVIDENCED",
    modules: [
      {
        id: "y07", no: 8, code: "Y07",
        title: "ควบคุมนโยบายและเอกสาร",
        subtitle: "DOCUMENT GOVERNANCE",
        bullets: [
          "Policy → Standard → Procedure → Form",
          "Draft · Review · Approve · Publish · Retire",
          "Version · Change History · Effective Date",
          "ISMS-01 คู่มือระบบการจัดการความปลอดภัยสารสนเทศ (ISMS Manual)",
          "Document master list (ทะเบียนเอกสาร)",
          "QP_01 การควบคุมเอกสาร",
        ],
        output: "Controlled Document Library",
      },
      {
        id: "y08", no: 9, code: "Y08",
        title: "Maholan ISO Playbook",
        subtitle: "KNOWLEDGE & TEMPLATE ENGINE",
        star: true,
        bullets: [
          "Guidance · Checklist · Pitfall รายขั้นตอน",
          "Template: เอกสาร · Risk Scenario · Control",
          "Apply Playbook → สร้าง Artifact ตั้งต้น",
        ],
        output: "Reusable Playbook Library",
      },
      {
        id: "y09", no: 10, code: "Y09",
        title: "ทำ Controls ให้เกิดปฏิบัติ + Evidence",
        subtitle: "CONTROL IMPLEMENTATION",
        bullets: [
          "Control Owner · Task · Checklist · Due",
          "Evidence Room + Metadata",
          "Control Test & Effectiveness Rating",
          "QP_03 การขอเข้าพื้นที่ควบคุม",
          "QP_05 การติดตามการใช้งานระบบสารสนเทศ",
          "QP_06 การควบคุมสิทธิ์การเข้าถึงและลงทะเบียนผู้ใช้งาน",
          "QP_07 การควบคุมการเปลี่ยนแปลงหรือแก้ไขระบบ",
          "QP_14 การออกแบบและพัฒนาระบบ",
          "QP_18 การกำหนดการตั้งค่าระบบ",
        ],
        output: "Control Status · Evidence Set",
      },
      {
        id: "y10", no: 11, code: "Y10",
        title: "ความสามารถและความตระหนัก",
        subtitle: "COMPETENCE & AWARENESS",
        bullets: [
          "Competence Matrix ตามบทบาท",
          "แผนอบรม · หลักสูตร · Attendance",
          "Policy Acknowledgement Campaign",
          "QP_12 การสรรหาบุคลากรและฝึกอบรมด้านนโยบาย",
        ],
        output: "Training & Acknowledgement Records",
      },
      {
        id: "y11", no: 12, code: "Y11",
        title: "ผู้ให้บริการภายนอก",
        subtitle: "SUPPLIER ASSURANCE · MVP",
        bullets: [
          "Supplier Register + Criticality",
          "Assessment Questionnaire & Result",
          "QP_13 การควบคุมผู้ให้บริการภายนอก",
        ],
        output: "Supplier Review Records",
      },
      {
        id: "y12", no: 13, code: "Y12",
        title: "เหตุการณ์และความต่อเนื่อง",
        subtitle: "INCIDENT & RESILIENCE · MVP",
        bullets: [
          "Incident Register · Type · Severity · Timeline",
          "Response & Lesson Learned",
          "BCP / DR Test Record",
          "SD-03 แผนบริหารวิกฤต",
          "QP_04 การสำรองและทดสอบกู้คืนข้อมูลระบบ",
          "QP_08 การบริหารจัดการอุบัติการณ์ที่ส่งผลต่อการให้บริการ",
          "QP_16 การบริหารจัดการความต่อเนื่องในการดำเนินงานขององค์กร",
        ],
        output: "Incident & BCP Test Log",
      },
    ],
  },
  {
    key: "p4",
    no: "PHASE 04",
    thTitle: "ประเมิน รับรอง และปรับปรุง",
    enTitle: "ASSURE & IMPROVE",
    note: "Step 14–18 · Y13–Y17 · AUDITED · AUDIT-READY",
    modules: [
      {
        id: "y13", no: 14, code: "Y13",
        title: "ตรวจประเมินภายใน",
        subtitle: "INTERNAL AUDIT",
        bullets: [
          "Audit Programme รายปี ครอบคลุม Scope",
          "Checklist จาก Playbook · ใช้บน Tablet",
          "Audit Report Generation (PDF/Word)",
          "ISMS Internal Audit Plan",
          "ISMS Internal Audit Procedure",
          "ISMS Internal Audit Checklist",
          "ISMS Internal Audit Report",
          "QP_10 การตรวจติดตามภายใน",
        ],
        output: "Programme · Findings · Report",
      },
      {
        id: "y14", no: 15, code: "Y14",
        title: "NC และ CAPA",
        subtitle: "NONCONFORMITY & CAPA",
        bullets: [
          "รวม NC ทุกแหล่ง: Audit · Incident · Gap · CB",
          "Root Cause (5 Why / Fishbone)",
          "แยก Correction vs Corrective Action",
          "QP_11 การปฏิบัติการแก้ไขและป้องกัน",
        ],
        output: "CAPA Register · Effectiveness",
      },
      {
        id: "y15", no: 16, code: "Y15",
        title: "ทบทวนโดยฝ่ายบริหาร",
        subtitle: "MANAGEMENT REVIEW",
        bullets: [
          "วาระครบตาม Clause 9.3.2",
          "Decision · Action Item · Owner · Due",
          "MR Minutes เป็นเอกสารควบคุม",
          "QP_17 การกำหนดวัตถุประสงค์และการประชุมทบทวน",
        ],
        output: "Minutes · Decisions · Actions",
      },
      {
        id: "y16", no: 17, code: "Y16",
        title: "ประเมินความพร้อมรับรอง",
        subtitle: "STAGE 1 & 2 READINESS",
        bullets: [
          "Readiness Scorecard ตาม Clause + Annex A",
          "Readiness Report สำหรับผู้บริหาร & CB",
        ],
        output: "Scorecard · Stage 1/2 Gate",
      },
      {
        id: "y17", no: 18, code: "Y17",
        title: "PBC และส่งมอบให้ CB",
        subtitle: "PBC WORKSPACE & HANDOVER",
        star: true,
        bullets: [
          "PBC List · Owner · Status · Due",
          "Export Evidence Package + Index + Access Log",
        ],
        output: "Evidence Package · Secure Portal",
      },
    ],
  },
  {
    key: "plat",
    no: "PLATFORM LAYER",
    thTitle: "รากฐานระบบ ใช้ร่วมทุก Phase",
    enTitle: "CROSS-CUTTING · Y18–Y20",
    note: "MULTI-TENANT · SECURE · AUDITABLE",
    modules: [
      {
        id: "y18", no: 19, code: "Y18",
        title: "แดชบอร์ดและรายงาน",
        subtitle: "DASHBOARDS & REPORTING",
        bullets: [
          "Executive: Journey Progress · Readiness % · Top Risk",
          "ISMS Manager: งานค้าง · Evidence Coverage · CAPA Aging",
          "Maholan Portfolio Dashboard (ข้าม Tenant)",
          "Standard Report Set · Export PDF / Excel",
          "Scheduled Report & Email Digest",
        ],
      },
      {
        id: "y19", no: 20, code: "Y19",
        title: "Workflow และการทำงานร่วมกัน",
        subtitle: "WORKFLOW · COLLABORATION",
        bullets: [
          "Configurable Workflow Engine · Delegation · Escalation",
          "Comment · Mention · Attachment ทุก Artifact",
          "Notification: In-app + Email",
          "My Task Inbox รวมจากทุกโมดูล",
          "Due / Overdue / Pending-Approval Alert",
        ],
      },
      {
        id: "y20", no: 21, code: "Y20",
        title: "Tenant สิทธิ์ และการดูแลระบบ",
        subtitle: "TENANT · IDENTITY · ADMIN",
        bullets: [
          "Multi-tenant Isolation & Provisioning",
          "SSO / OAuth2 · MFA · Password & Session Policy",
          "RBAC 13 บทบาท รวม CB Guest & Consultant",
          "Master Data: Annex A · Clause · Threat Library",
          "Immutable Audit Trail · Backup · Retention",
        ],
      },
    ],
  },
];

export const traceChain = [
  "Context / Obligation",
  "Scope",
  "Process / Asset",
  "Risk",
  "Treatment",
  "Control / SoA",
  "Policy / Procedure",
  "Task & Owner",
  "Evidence (Period)",
  "Control Test / Audit",
  "Finding",
  "CAPA & Effectiveness",
  "Management Review",
  "Stage 1 / Stage 2 Readiness",
];

export const outcomeChips = [
  { t: "✓ Scope ได้รับอนุมัติ", s: "APPROVED ISMS SCOPE" },
  { t: "✓ Risk และ SoA เชื่อมโยงกัน", s: "TRACEABLE RISK & CONTROLS" },
  { t: "✓ หลักฐานตรวจสอบย้อนกลับได้", s: "VERIFIED & FROZEN EVIDENCE" },
  { t: "✓ Playbook นำกลับใช้ซ้ำได้", s: "REUSABLE CONSULTANT KNOWLEDGE" },
  { t: "✓ พร้อมเข้า Stage 1 / Stage 2", s: "CERTIFICATION AUDIT READY" },
];

// Flat lookup by slug for process pages.
export const moduleById: Record<string, { module: Module; phase: Phase }> =
  Object.fromEntries(
    phases.flatMap((phase) =>
      phase.modules.map((module) => [module.id, { module, phase }]),
    ),
  );

export function allModuleIds(): string[] {
  return phases.flatMap((p) => p.modules.map((m) => m.id));
}
