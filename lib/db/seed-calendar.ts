// Seed the ISO Action Plan calendar (FY2026: Oct 2025 – Sep 2026) from the
// company's Action Plan / KPI timeline. Idempotent per year.
// Run: npm run db:seed-calendar

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const YEAR = 2026;
const FY_START_YEAR = 2025; // fiscal year starts Oct 2025

type Cad = "monthly" | "quarterly" | "biannual" | "annual" | "once";

const ITEMS: {
  seq: number; title: string; responsible: string; qpRef?: string; category: string; cadence: Cad;
}[] = [
  { seq: 1, title: "ประชุมคณะทำงาน Post-Review หลังตรวจประเมินรับรอง", responsible: "ISMS Core Team", category: "Certification", cadence: "once" },
  { seq: 2, title: "สรุปผลการตรวจประเมินรับรอง + ทบทวนฝ่ายบริหาร", responsible: "ผู้บริหาร", qpRef: "QP-17", category: "Certification", cadence: "once" },
  { seq: 3, title: "ปรับปรุงแก้ไขตามข้อเสนอผู้ตรวจ (NC/OFI)", responsible: "ISMS Core Team", category: "Certification", cadence: "once" },
  { seq: 4, title: "รับมอบใบรับรอง (Certificate) จาก CB", responsible: "ISMS Core Team + CEO", category: "Certification", cadence: "once" },
  { seq: 5, title: "KPI: การปกป้องข้อมูลระบบและความต่อเนื่องบริการ (5.1.1.1)", responsible: "ISMS Team + SE", qpRef: "QP-17", category: "KPI", cadence: "biannual" },
  { seq: 6, title: "KPI: การรักษาความปลอดภัยจากการเข้าถึงที่ไม่ได้รับอนุญาต (5.1.1.2)", responsible: "ISMS Team + SE + DE", qpRef: "QP-17", category: "KPI", cadence: "monthly" },
  { seq: 7, title: "KPI: การดูแลข้อมูลสำคัญและข้อมูลความลับ (5.1.1.3)", responsible: "ISMS Team + SE", qpRef: "QP-17", category: "KPI", cadence: "monthly" },
  { seq: 8, title: "KPI: การให้บริการตามมาตรฐานสากล (5.1.1.4)", responsible: "Internal Audit", qpRef: "QP-17", category: "KPI", cadence: "annual" },
  { seq: 9, title: "KPI: ความสอดคล้องตามข้อกำหนด ISMS > 99%", responsible: "Internal Audit + SE", qpRef: "QP-17", category: "KPI", cadence: "quarterly" },
  { seq: 10, title: "KPI: การตรวจติดตามและประเมินผลจากผู้รับรอง (5.1.1.5)", responsible: "ISMS Core Team + BSI", qpRef: "QP-17", category: "KPI", cadence: "annual" },
  { seq: 11, title: "การตรวจติดตามภายใน (Internal Audit)", responsible: "Internal Audit", category: "Standard", cadence: "annual" },
  { seq: 12, title: "การประเมินความพึงพอใจ ISMS", responsible: "ISMS Team", category: "Standard", cadence: "annual" },
  { seq: 13, title: "การประชุมทบทวนของฝ่ายบริหาร (Management Review)", responsible: "ISMS Team & CIO & CEO", qpRef: "QP-17", category: "Standard", cadence: "biannual" },
  { seq: 14, title: "ทดสอบการสำรองข้อมูล (Backup Test)", responsible: "SE", qpRef: "QP-04", category: "Standard", cadence: "monthly" },
  { seq: 15, title: "ทดสอบการกู้คืน (Restore Test)", responsible: "SE", qpRef: "QP-04", category: "Standard", cadence: "biannual" },
  { seq: 16, title: "Monitoring Health Check", responsible: "SE", qpRef: "QP-05", category: "Standard", cadence: "biannual" },
  { seq: 17, title: "Password Policy review & announcement", responsible: "SE", qpRef: "QP-06", category: "Standard", cadence: "biannual" },
  { seq: 18, title: "Request of Change summary", responsible: "SE", qpRef: "QP-07", category: "Standard", cadence: "biannual" },
  { seq: 19, title: "Incident Ticket summary", responsible: "SE", qpRef: "QP-08", category: "Standard", cadence: "monthly" },
  { seq: 20, title: "Risk Management Summary (review & RTP)", responsible: "ISMS Team", qpRef: "QP-09", category: "Standard", cadence: "biannual" },
  { seq: 21, title: "SoA Review", responsible: "ISMS Team", qpRef: "QP-09", category: "Standard", cadence: "biannual" },
  { seq: 22, title: "Job Description / Employee Handbook review", responsible: "HR", qpRef: "QP-12", category: "Standard", cadence: "biannual" },
  { seq: 23, title: "Deployment Checklist review", responsible: "SE", qpRef: "QP-14", category: "Standard", cadence: "biannual" },
  { seq: 24, title: "Review Legal & Compliance", responsible: "ISMS Team", qpRef: "QP-15", category: "Standard", cadence: "biannual" },
  { seq: 25, title: "Business Continuity Plan (BCP/BIA/Test)", responsible: "CEO & CIO & SE & ISMS Team", qpRef: "QP-16", category: "Standard", cadence: "quarterly" },
  { seq: 26, title: "Management Review Procedure", responsible: "ISMS Team", qpRef: "QP-17", category: "Standard", cadence: "biannual" },
  { seq: 27, title: "Review Configuration Item", responsible: "SE", qpRef: "QP-18", category: "Standard", cadence: "biannual" },
  { seq: 28, title: "BCP Awareness training", responsible: "Employee", category: "Training", cadence: "annual" },
  { seq: 29, title: "ISMS Awareness (Recap) training", responsible: "Employee", category: "Training", cadence: "annual" },
  { seq: 30, title: "Security Awareness #3: Secure data handling", responsible: "Employee", category: "Training", cadence: "once" },
  { seq: 31, title: "Security Awareness #4: Physical security, Access control, Remote work", responsible: "Employee", category: "Training", cadence: "once" },
];

function d(year: number, month1: number, day: number): Date {
  // noon Thailand (UTC+7) ≈ 05:00 UTC
  return new Date(Date.UTC(year, month1 - 1, day, 5, 0, 0));
}

function occurrencesFor(cad: Cad): { dueDate: Date; periodLabel: string }[] {
  const y1 = FY_START_YEAR; // 2025 (Oct–Dec)
  const y2 = FY_START_YEAR + 1; // 2026 (Jan–Sep)
  switch (cad) {
    case "monthly": {
      const out: { dueDate: Date; periodLabel: string }[] = [];
      // Oct'25..Dec'25 then Jan'26..Sep'26
      for (const m of [10, 11, 12]) out.push({ dueDate: d(y1, m, 25), periodLabel: `${y1}-${String(m).padStart(2, "0")}` });
      for (let m = 1; m <= 9; m++) out.push({ dueDate: d(y2, m, 25), periodLabel: `${y2}-${String(m).padStart(2, "0")}` });
      return out;
    }
    case "quarterly":
      return [
        { dueDate: d(y1, 12, 25), periodLabel: `Q1-${YEAR}` },
        { dueDate: d(y2, 3, 25), periodLabel: `Q2-${YEAR}` },
        { dueDate: d(y2, 6, 25), periodLabel: `Q3-${YEAR}` },
        { dueDate: d(y2, 9, 25), periodLabel: `Q4-${YEAR}` },
      ];
    case "biannual":
      return [
        { dueDate: d(y2, 3, 25), periodLabel: `H1-${YEAR}` },
        { dueDate: d(y2, 9, 25), periodLabel: `H2-${YEAR}` },
      ];
    case "annual":
      return [{ dueDate: d(y2, 9, 25), periodLabel: `ANNUAL-${YEAR}` }];
    case "once":
      return [{ dueDate: d(y1, 10, 31), periodLabel: `ONCE-${YEAR}` }];
  }
}

async function main() {
  const { db } = await import("./index");
  const { actionItems, actionOccurrences } = await import("./schema");
  const { eq } = await import("drizzle-orm");

  // fresh per year
  await db.delete(actionItems).where(eq(actionItems.year, YEAR));
  console.log(`Seeding ${ITEMS.length} action items for FY${YEAR}...`);

  let occ = 0;
  for (const it of ITEMS) {
    const [row] = await db
      .insert(actionItems)
      .values({
        year: YEAR, seq: it.seq, title: it.title, responsible: it.responsible,
        qpRef: it.qpRef ?? null, category: it.category, cadence: it.cadence, leadDays: 7,
      })
      .returning();
    const occs = occurrencesFor(it.cadence).map((o) => ({
      itemId: row.id, dueDate: o.dueDate, periodLabel: o.periodLabel,
    }));
    if (occs.length) {
      await db.insert(actionOccurrences).values(occs).onConflictDoNothing();
      occ += occs.length;
    }
  }
  console.log(`Done. ${ITEMS.length} items, ${occ} occurrences.`);
  process.exit(0);
}

main().catch((e) => { console.error("seed-calendar failed:", e); process.exit(1); });
