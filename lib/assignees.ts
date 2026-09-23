// Users list + per-process default reviewer/approver (single each).

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { processAssignees, processes, users, eventLog } from "@/lib/db/schema";
import { logEvent } from "@/lib/events";

export type UserOption = { id: string; name: string | null; email: string };

export async function listUsers(): Promise<UserOption[]> {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(users.name);
}

export type ProcessDefaults = {
  reviewerId: string | null;
  approverId: string | null;
};

export async function getProcessDefaults(processId: string): Promise<ProcessDefaults> {
  const rows = await db
    .select()
    .from(processAssignees)
    .where(eq(processAssignees.processId, processId));
  return {
    reviewerId: rows.find((r) => r.flowRole === "reviewer")?.userId ?? null,
    approverId: rows.find((r) => r.flowRole === "approver")?.userId ?? null,
  };
}

/** Set (or clear) the single default for a role on a process.
 *  Logs an 'assignee_changed' event (QW1 audit) when actorId is given and the
 *  value actually changes. */
export async function setProcessDefault(
  processId: string,
  flowRole: "reviewer" | "approver",
  userId: string | null,
  actorId?: string,
): Promise<void> {
  const [cur] = await db
    .select({ userId: processAssignees.userId })
    .from(processAssignees)
    .where(and(eq(processAssignees.processId, processId), eq(processAssignees.flowRole, flowRole)));
  const oldId = cur?.userId ?? null;

  await db
    .delete(processAssignees)
    .where(
      and(
        eq(processAssignees.processId, processId),
        eq(processAssignees.flowRole, flowRole),
      ),
    );
  if (userId) {
    await db.insert(processAssignees).values({ processId, userId, flowRole });
  }

  if (actorId && oldId !== userId) {
    await logEvent({
      entityType: "process",
      entityId: processId,
      actorId,
      action: "assignee_changed",
      metadata: { flowRole, fromUserId: oldId, toUserId: userId },
    });
  }
}

export type ProcessWithDefaults = {
  id: string;
  code: string;
  slug: string;
  title: string;
  reviewerId: string | null;
  approverId: string | null;
};

/** All processes (ordered) with their default reviewer/approver. */
export async function listProcessesWithDefaults(): Promise<ProcessWithDefaults[]> {
  const procs = await db
    .select({ id: processes.id, code: processes.code, slug: processes.slug, title: processes.title })
    .from(processes)
    .orderBy(asc(processes.sortOrder));
  const rows = await db.select().from(processAssignees);
  const byProc = new Map<string, { reviewerId: string | null; approverId: string | null }>();
  for (const r of rows) {
    const e = byProc.get(r.processId) ?? { reviewerId: null, approverId: null };
    if (r.flowRole === "reviewer") e.reviewerId = r.userId;
    else e.approverId = r.userId;
    byProc.set(r.processId, e);
  }
  return procs.map((p) => ({ ...p, ...(byProc.get(p.id) ?? { reviewerId: null, approverId: null }) }));
}

export class AssigneeError extends Error {
  status = 400;
}

/** Apply the same default reviewer/approver to ALL processes at once.
 *  Enforces segregation of duties (reviewer ≠ approver) and logs one
 *  'assignee_bulk_set' audit event. */
export async function setAllProcessDefaults(
  reviewerId: string | null,
  approverId: string | null,
  actorId?: string,
): Promise<void> {
  if (reviewerId && approverId && reviewerId === approverId) {
    throw new AssigneeError("ผู้ตรวจและผู้อนุมัติต้องเป็นคนละคน (แยกหน้าที่)");
  }
  const procs = await db.select({ id: processes.id }).from(processes);
  for (const p of procs) {
    await setProcessDefault(p.id, "reviewer", reviewerId);
    await setProcessDefault(p.id, "approver", approverId);
  }
  if (actorId) {
    await logEvent({
      entityType: "process",
      entityId: null,
      actorId,
      action: "assignee_bulk_set",
      metadata: { reviewerId, approverId, count: procs.length },
    });
  }
}

/** Coverage + segregation-of-duties summary across all processes (QW2/QW3). */
export async function getAssignmentCoverage(): Promise<{
  total: number;
  reviewerSet: number;
  approverSet: number;
  missingReviewer: string[]; // process codes
  missingApprover: string[];
  sodViolations: string[]; // reviewer === approver
}> {
  const rows = await listProcessesWithDefaults();
  const missingReviewer: string[] = [];
  const missingApprover: string[] = [];
  const sodViolations: string[] = [];
  let reviewerSet = 0;
  let approverSet = 0;
  for (const r of rows) {
    if (r.reviewerId) reviewerSet++; else missingReviewer.push(r.code);
    if (r.approverId) approverSet++; else missingApprover.push(r.code);
    if (r.reviewerId && r.approverId && r.reviewerId === r.approverId) sodViolations.push(r.code);
  }
  return { total: rows.length, reviewerSet, approverSet, missingReviewer, missingApprover, sodViolations };
}

export type AssignmentEvent = {
  id: string;
  action: string;
  actorName: string | null;
  processCode: string | null;
  metadata: unknown;
  createdAt: Date;
};

/** Recent assignment-change audit events (QW1). */
export async function listAssignmentEvents(limit = 30): Promise<AssignmentEvent[]> {
  const rows = await db
    .select({
      id: eventLog.id,
      action: eventLog.action,
      actorName: users.name,
      processCode: processes.code,
      metadata: eventLog.metadata,
      createdAt: eventLog.createdAt,
    })
    .from(eventLog)
    .leftJoin(users, eq(eventLog.actorId, users.id))
    .leftJoin(processes, eq(eventLog.entityId, processes.id))
    .where(inArray(eventLog.action, ["assignee_changed", "assignee_bulk_set"]))
    .orderBy(desc(eventLog.createdAt))
    .limit(limit);
  return rows;
}
