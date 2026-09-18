// Users list + per-process default reviewer/approver (single each).

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { processAssignees, users } from "@/lib/db/schema";

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
