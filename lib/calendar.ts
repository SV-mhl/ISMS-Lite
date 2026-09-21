// ISO Action Plan calendar: read + admin mutations.

import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { actionItems, actionOccurrences } from "@/lib/db/schema";
import { logEvent } from "@/lib/events";

export type OccurrenceRow = {
  id: string;
  dueDate: Date;
  periodLabel: string;
  status: string;
  remindedAt: Date | null;
};

export type CalendarItem = {
  id: string;
  seq: number;
  title: string;
  responsible: string | null;
  qpRef: string | null;
  category: string | null;
  cadence: string;
  leadDays: number;
  active: boolean;
  occurrences: OccurrenceRow[];
};

export async function listCalendar(year: number): Promise<CalendarItem[]> {
  const items = await db
    .select()
    .from(actionItems)
    .where(eq(actionItems.year, year))
    .orderBy(asc(actionItems.seq));

  const ids = items.map((i) => i.id);
  const occ = ids.length
    ? await db
        .select()
        .from(actionOccurrences)
        .where(inArray(actionOccurrences.itemId, ids))
        .orderBy(asc(actionOccurrences.dueDate))
    : [];

  const byItem = new Map<string, OccurrenceRow[]>();
  for (const o of occ) {
    const arr = byItem.get(o.itemId) ?? [];
    arr.push({ id: o.id, dueDate: o.dueDate, periodLabel: o.periodLabel, status: o.status, remindedAt: o.remindedAt });
    byItem.set(o.itemId, arr);
  }

  return items.map((i) => ({
    id: i.id, seq: i.seq, title: i.title, responsible: i.responsible, qpRef: i.qpRef,
    category: i.category, cadence: i.cadence, leadDays: i.leadDays, active: i.active,
    occurrences: byItem.get(i.id) ?? [],
  }));
}

export async function availableYears(): Promise<number[]> {
  const rows = await db.select({ year: actionItems.year }).from(actionItems);
  return [...new Set(rows.map((r) => r.year))].sort((a, b) => b - a);
}

export async function updateLeadDays(itemId: string, leadDays: number): Promise<void> {
  const v = Math.max(0, Math.min(120, Math.floor(leadDays)));
  await db.update(actionItems).set({ leadDays: v }).where(eq(actionItems.id, itemId));
}

export async function setOccurrenceDone(
  occId: string,
  userId: string,
  done: boolean,
): Promise<void> {
  await db
    .update(actionOccurrences)
    .set({
      status: done ? "done" : "pending",
      completedAt: done ? new Date() : null,
      completedBy: done ? userId : null,
    })
    .where(eq(actionOccurrences.id, occId));

  await logEvent({
    entityType: "task",
    entityId: occId,
    actorId: userId,
    action: done ? "action_completed" : "action_reopened",
  });
}
