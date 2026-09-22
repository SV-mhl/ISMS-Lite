// Users list + per-process default reviewer/approver (single each).

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { processAssignees, processes, users } from "@/lib/db/schema";

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

/** Set (or clear) the single default for a role on a process. */
export async function setProcessDefault(
  processId: string,
  flowRole: "reviewer" | "approver",
  userId: string | null,
): Promise<void> {
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

/** Apply the same default reviewer/approver to ALL processes at once. */
export async function setAllProcessDefaults(
  reviewerId: string | null,
  approverId: string | null,
): Promise<void> {
  const procs = await db.select({ id: processes.id }).from(processes);
  for (const p of procs) {
    await setProcessDefault(p.id, "reviewer", reviewerId);
    await setProcessDefault(p.id, "approver", approverId);
  }
}
