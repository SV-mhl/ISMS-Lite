import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AppBar from "@/components/appbar";
import SettingsAssignees from "@/components/settings-assignees";
import { listProcessesWithDefaults, listUsers } from "@/lib/assignees";
import { canManage } from "@/lib/policy";

export default async function SettingsAssigneesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canManage(session.user.role)) redirect("/");

  const [processes, users] = await Promise.all([listProcessesWithDefaults(), listUsers()]);

  return (
    <div className="wrap">
      <AppBar />
      <div style={{ padding: "18px 20px" }}>
        <h1 style={{ fontSize: 18, color: "#0d356f", fontWeight: 700 }}>
          ตั้งค่าผู้ตรวจ/ผู้อนุมัติเริ่มต้น
        </h1>
        <p style={{ fontSize: 12.5, color: "#7189a8", margin: "3px 0 16px" }}>
          กำหนดค่าเริ่มต้นให้ทุกกระบวนการทีเดียว หรือรายกระบวนการ · ค่านี้จะเติมอัตโนมัติตอนผู้จัดทำกด “ส่งตรวจ” (ยังแก้รายเอกสารได้)
        </p>
        <SettingsAssignees processes={processes} users={users} />
      </div>
    </div>
  );
}
