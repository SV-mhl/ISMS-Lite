// Task Inbox: pending review/approve tasks assigned to a user.

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflowTasks, documents, processes } from "@/lib/db/schema";

export type InboxItem = {
  taskId: string;
  taskType: "review" | "approve";
  documentId: string;
  documentTitle: string;
  processSlug: string;
  processTitle: string;
  createdAt: Date;
};

export async function listInboxTasks(userId: string): Promise<InboxItem[]> {
  return db
    .select({
      taskId: workflowTasks.id,
      taskType: workflowTasks.taskType,
      documentId: workflowTasks.documentId,
      documentTitle: documents.title,
      processSlug: processes.slug,
      processTitle: processes.title,
      createdAt: workflowTasks.createdAt,
    })
    .from(workflowTasks)
    .innerJoin(documents, eq(workflowTasks.documentId, documents.id))
    .innerJoin(processes, eq(documents.processId, processes.id))
    .where(and(eq(workflowTasks.assigneeId, userId), eq(workflowTasks.status, "pending")))
    .orderBy(desc(workflowTasks.createdAt));
}

export async function countInboxTasks(userId: string): Promise<number> {
  const rows = await db
    .select({ id: workflowTasks.id })
    .from(workflowTasks)
    .where(and(eq(workflowTasks.assigneeId, userId), eq(workflowTasks.status, "pending")));
  return rows.length;
}
