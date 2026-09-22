import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AppBar from "@/components/appbar";
import CalendarBoard, { type ItemSerial } from "@/components/calendar-board";
import { listCalendar, availableYears } from "@/lib/calendar";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const years = await availableYears();
  const { year: yq } = await searchParams;
  const qn = Number(yq);
  const year = yq && years.includes(qn) ? qn : (years[0] ?? 2026);
  const items = await listCalendar(year);

  const serial: ItemSerial[] = items.map((i) => ({
    id: i.id, seq: i.seq, title: i.title, responsible: i.responsible, qpRef: i.qpRef,
    category: i.category, cadence: i.cadence, leadDays: i.leadDays, active: i.active,
    occurrences: i.occurrences.map((o) => ({
      id: o.id, dueDate: o.dueDate.toISOString(), periodLabel: o.periodLabel,
      status: o.status, remindedAt: o.remindedAt ? o.remindedAt.toISOString() : null,
    })),
  }));

  return (
    <div className="wrap">
      <AppBar />
      <div style={{ padding: "18px 20px" }}>
        <h1 style={{ fontSize: 18, color: "#0d356f", fontWeight: 700 }}>ปฏิทินงาน ISO (Action Plan)</h1>
        <p style={{ fontSize: 12.5, color: "#7189a8", margin: "3px 0 14px" }}>
          กำหนดการปฏิบัติงานตาม KPI/QP รายเดือน–ไตรมาส–ครึ่งปี–รายปี · ระบบแจ้งเตือนล่วงหน้าอัตโนมัติ
          {session.user.role === "admin" && " · ผู้ดูแลปรับจำนวนวันแจ้งล่วงหน้าได้"}
        </p>
        <CalendarBoard items={serial} isAdmin={session.user.role === "admin"} year={year} years={years} />
      </div>
    </div>
  );
}
