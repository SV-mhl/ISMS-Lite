// Advance-reminder engine for ISO action occurrences.
// Sends one reminder per occurrence once "now" reaches (dueDate - leadDays),
// to the item's notifyUser (or all admins), in-app + email. Idempotent via
// remindedAt. Invoked daily by /api/cron/reminders.

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { actionItems, actionOccurrences, users } from "@/lib/db/schema";
import { notifyMany } from "@/lib/notify";

const DAY = 86_400_000;

async function adminIds(): Promise<string[]> {
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  return rows.map((r) => r.id);
}

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
}

export async function runReminders(now: Date = new Date()): Promise<{ sent: number }> {
  const rows = await db
    .select({
      occId: actionOccurrences.id,
      dueDate: actionOccurrences.dueDate,
      periodLabel: actionOccurrences.periodLabel,
      title: actionItems.title,
      responsible: actionItems.responsible,
      qpRef: actionItems.qpRef,
      leadDays: actionItems.leadDays,
      active: actionItems.active,
      notifyUserId: actionItems.notifyUserId,
    })
    .from(actionOccurrences)
    .innerJoin(actionItems, eq(actionOccurrences.itemId, actionItems.id))
    .where(and(eq(actionOccurrences.status, "pending"), isNull(actionOccurrences.remindedAt)));

  let admins: string[] | null = null;
  let sent = 0;

  for (const r of rows) {
    if (!r.active) continue;
    const due = new Date(r.dueDate).getTime();
    const start = due - r.leadDays * DAY;
    // fire only within the advance window [due − leadDays, due]; not for
    // long-overdue items (a daily cron catches each due date in time)
    if (now.getTime() < start || now.getTime() > due) continue;

    const recipients = r.notifyUserId ? [r.notifyUserId] : (admins ??= await adminIds());
    if (recipients.length === 0) continue;

    await notifyMany(recipients, {
      type: "action_due",
      title: `⏰ ใกล้ถึงกำหนดงาน ISO: ${r.title}`,
      body: `ครบกำหนด ${fmtDate(r.dueDate)} (${r.periodLabel})${r.qpRef ? " · " + r.qpRef : ""}${r.responsible ? " · ผู้รับผิดชอบ " + r.responsible : ""}`,
      linkPath: "/calendar",
    });

    await db
      .update(actionOccurrences)
      .set({ remindedAt: now })
      .where(eq(actionOccurrences.id, r.occId));
    sent++;
  }

  return { sent };
}
