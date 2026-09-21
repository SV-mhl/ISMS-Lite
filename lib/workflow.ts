// Workflow engine: Draft → Review → Approved → Published (+ reject).
// The "review" status spans two sequential gates represented by tasks:
// a review task (reviewer) then an approve task (approver). Publish is a
// separate action by the approver or an admin.

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, workflowTasks } from "@/lib/db/schema";
import { logEvent } from "@/lib/events";
import { notify, notifyMany } from "@/lib/notify";

export class WorkflowError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

async function getDoc(documentId: string) {
  const [d] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!d) throw new WorkflowError("ไม่พบเอกสาร", 404);
  return d;
}

async function pendingTask(documentId: string, taskType: "review" | "approve") {
  const [t] = await db
    .select()
    .from(workflowTasks)
    .where(
      and(
        eq(workflowTasks.documentId, documentId),
        eq(workflowTasks.taskType, taskType),
        eq(workflowTasks.status, "pending"),
      ),
    );
  return t ?? null;
}

async function cancelPending(documentId: string) {
  await db
    .update(workflowTasks)
    .set({ status: "rejected", actedAt: new Date() })
    .where(
      and(eq(workflowTasks.documentId, documentId), eq(workflowTasks.status, "pending")),
    );
}

/** Author submits a draft/rejected doc for review with chosen reviewer + approver. */
export async function submitForReview(params: {
  documentId: string;
  reviewerId: string;
  approverId: string;
  userId: string;
}) {
  const { documentId, reviewerId, approverId, userId } = params;
  const doc = await getDoc(documentId);
  if (doc.status !== "draft" && doc.status !== "rejected") {
    throw new WorkflowError("ส่งตรวจได้เฉพาะเอกสารสถานะ ร่าง หรือ ตีกลับ");
  }
  if (!reviewerId || !approverId) {
    throw new WorkflowError("กรุณาเลือกผู้ตรวจและผู้อนุมัติ");
  }

  await cancelPending(documentId);
  await db
    .update(documents)
    .set({ status: "review", reviewerId, approverId, updatedAt: new Date() })
    .where(eq(documents.id, documentId));

  await db.insert(workflowTasks).values({
    documentId,
    versionId: doc.currentVersionId,
    assigneeId: reviewerId,
    taskType: "review",
    status: "pending",
  });

  await logEvent({
    entityType: "document",
    entityId: documentId,
    documentId,
    actorId: userId,
    action: "submitted_review",
    fromStatus: doc.status,
    toStatus: "review",
    metadata: { reviewerId, approverId },
  });

  await notify({
    recipientId: reviewerId,
    type: "review_requested",
    title: "มีเอกสารรอคุณตรวจสอบ",
    body: `เอกสาร "${doc.title}" ถูกส่งให้คุณตรวจสอบ`,
    documentId,
  });
}

/** Reviewer passes the review → creates the approve task. */
export async function reviewApprove(params: {
  documentId: string;
  userId: string;
  comment?: string;
}) {
  const { documentId, userId, comment } = params;
  const doc = await getDoc(documentId);
  if (doc.status !== "review") throw new WorkflowError("เอกสารไม่อยู่ในขั้นรอตรวจ");

  const task = await pendingTask(documentId, "review");
  if (!task) throw new WorkflowError("ไม่พบงานตรวจที่ค้างอยู่");
  if (task.assigneeId !== userId) {
    throw new WorkflowError("คุณไม่ใช่ผู้ตรวจของเอกสารนี้", 403);
  }
  if (!doc.approverId) throw new WorkflowError("เอกสารไม่มีผู้อนุมัติกำหนดไว้");

  await db
    .update(workflowTasks)
    .set({ status: "done", comment: comment ?? null, actedAt: new Date() })
    .where(eq(workflowTasks.id, task.id));

  await db.insert(workflowTasks).values({
    documentId,
    versionId: doc.currentVersionId,
    assigneeId: doc.approverId,
    taskType: "approve",
    status: "pending",
  });

  await logEvent({
    entityType: "document",
    entityId: documentId,
    documentId,
    actorId: userId,
    action: "reviewed",
    fromStatus: "review",
    toStatus: "review",
    metadata: comment ? { comment } : null,
  });

  await notify({
    recipientId: doc.approverId,
    type: "approval_requested",
    title: "มีเอกสารรอคุณอนุมัติ",
    body: `เอกสาร "${doc.title}" ผ่านการตรวจแล้ว รอคุณอนุมัติ`,
    documentId,
  });
  await notify({
    recipientId: doc.createdBy,
    type: "reviewed",
    title: "เอกสารของคุณผ่านการตรวจแล้ว",
    body: `เอกสาร "${doc.title}" ผ่านการตรวจ กำลังรอผู้อนุมัติ`,
    documentId,
  });
}

/** Approver approves → status Approved. */
export async function approverApprove(params: {
  documentId: string;
  userId: string;
  comment?: string;
}) {
  const { documentId, userId, comment } = params;
  const doc = await getDoc(documentId);
  if (doc.status !== "review") throw new WorkflowError("เอกสารไม่อยู่ในขั้นอนุมัติ");

  const task = await pendingTask(documentId, "approve");
  if (!task) throw new WorkflowError("ยังไม่ถึงขั้นอนุมัติ (ต้องผ่านการตรวจก่อน)");
  if (task.assigneeId !== userId) {
    throw new WorkflowError("คุณไม่ใช่ผู้อนุมัติของเอกสารนี้", 403);
  }

  await db
    .update(workflowTasks)
    .set({ status: "done", comment: comment ?? null, actedAt: new Date() })
    .where(eq(workflowTasks.id, task.id));

  await db
    .update(documents)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(documents.id, documentId));

  await logEvent({
    entityType: "document",
    entityId: documentId,
    documentId,
    actorId: userId,
    action: "approved",
    fromStatus: "review",
    toStatus: "approved",
    metadata: comment ? { comment } : null,
  });

  await notify({
    recipientId: doc.createdBy,
    type: "approved",
    title: "เอกสารของคุณได้รับอนุมัติแล้ว",
    body: `เอกสาร "${doc.title}" ได้รับอนุมัติ พร้อมเผยแพร่`,
    documentId,
  });
}

/** Reviewer or approver rejects → back to author (status rejected). Requires reason. */
export async function reject(params: {
  documentId: string;
  userId: string;
  comment: string;
}) {
  const { documentId, userId, comment } = params;
  const doc = await getDoc(documentId);
  if (doc.status !== "review") {
    throw new WorkflowError("ตีกลับได้เฉพาะเอกสารที่กำลังตรวจ/อนุมัติ");
  }
  if (!comment || !comment.trim()) {
    throw new WorkflowError("กรุณาระบุเหตุผลการตีกลับ");
  }

  const approveT = await pendingTask(documentId, "approve");
  const reviewT = await pendingTask(documentId, "review");
  const active = approveT ?? reviewT;
  if (!active) throw new WorkflowError("ไม่มีงานที่ค้างให้ตีกลับ");
  if (active.assigneeId !== userId) {
    throw new WorkflowError("คุณไม่ใช่ผู้รับผิดชอบขั้นนี้", 403);
  }

  await cancelPending(documentId);
  await db
    .update(workflowTasks)
    .set({ status: "rejected", comment, actedAt: new Date() })
    .where(eq(workflowTasks.id, active.id));

  await db
    .update(documents)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(documents.id, documentId));

  await logEvent({
    entityType: "document",
    entityId: documentId,
    documentId,
    actorId: userId,
    action: "rejected",
    fromStatus: "review",
    toStatus: "rejected",
    metadata: { comment, stage: approveT ? "approve" : "review" },
  });

  await notify({
    recipientId: doc.createdBy,
    type: "rejected",
    title: "เอกสารถูกตีกลับ",
    body: `เอกสาร "${doc.title}" ถูกตีกลับ: ${comment}`,
    documentId,
  });
}

/** Publish an approved document (approver or admin). */
export async function publish(params: {
  documentId: string;
  userId: string;
  role: "admin" | "member";
}) {
  const { documentId, userId, role } = params;
  const doc = await getDoc(documentId);
  if (doc.status !== "approved") {
    throw new WorkflowError("เผยแพร่ได้เฉพาะเอกสารที่อนุมัติแล้ว");
  }
  const allowed = role === "admin" || doc.approverId === userId;
  if (!allowed) {
    throw new WorkflowError("เฉพาะผู้อนุมัติหรือผู้ดูแลระบบเท่านั้นที่เผยแพร่ได้", 403);
  }

  // the just-published version becomes the effective (downloadable) copy
  await db
    .update(documents)
    .set({
      status: "published",
      effectiveVersionId: doc.currentVersionId,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));

  await logEvent({
    entityType: "document",
    entityId: documentId,
    documentId,
    actorId: userId,
    action: "published",
    fromStatus: "approved",
    toStatus: "published",
  });

  await notifyMany([doc.createdBy, doc.reviewerId, doc.approverId], {
    type: "published",
    title: "เอกสารเผยแพร่แล้ว",
    body: `เอกสาร "${doc.title}" เผยแพร่เรียบร้อยแล้ว`,
    documentId,
  });
}
