// ISO Action Plan calendar: read + admin mutations.

import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { actionItems, actionOccurrences } from "@/lib/db/schema";
import { logEvent } from "@/lib/events";
import { PLAN_ITEMS, buildOccurrences } from "@/lib/action-plan-template";

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

/** How many items already exist for a plan year (for dup-import warning). */
export async function planYearCount(year: number): Promise<number> {
  const rows = await db.select({ id: actionItems.id }).from(actionItems).where(eq(actionItems.year, year));
  return rows.length;
}

/**
 * Import a plan year from the shared template (stub: reuses the known 31
 * activities shifted to `year`; real PDF-table parsing is deferred).
 * Refuses to overwrite an existing year unless `force`.
 */
export async function importPlanYear(
  year: number,
  opts: { force?: boolean } = {},
): Promise<{ items: number; occurrences: number; replaced: boolean }> {
  const existing = await planYearCount(year);
  if (existing > 0 && !opts.force) {
    const err = new Error(`ปฏิทินปี ${year} มีอยู่แล้ว (${existing} รายการ)`) as Error & {
      code?: string; existingCount?: number;
    };
    err.code = "PLAN_EXISTS";
    err.existingCount = existing;
    throw err;
  }
  if (existing > 0) {
    await db.delete(actionItems).where(eq(actionItems.year, year)); // cascade occurrences
  }

  let occ = 0;
  for (const it of PLAN_ITEMS) {
    const [row] = await db
      .insert(actionItems)
      .values({
        year, seq: it.seq, title: it.title, responsible: it.responsible,
        qpRef: it.qpRef ?? null, category: it.category, cadence: it.cadence, leadDays: 7,
      })
      .returning();
    const occs = buildOccurrences(it.cadence, year).map((o) => ({
      itemId: row.id, dueDate: o.dueDate, periodLabel: o.periodLabel,
    }));
    if (occs.length) {
      await db.insert(actionOccurrences).values(occs).onConflictDoNothing();
      occ += occs.length;
    }
  }
  return { items: PLAN_ITEMS.length, occurrences: occ, replaced: existing > 0 };
}
