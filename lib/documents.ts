// Document domain logic: check-in, versioning, listing.
// Ties together Drive (files) + DB (metadata/state) + event log.

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  processes,
  documents,
  documentVersions,
  workflowTasks,
  users,
  type Process,
} from "@/lib/db/schema";
import { ensureFolder, getRootId, uploadFile, trashFile } from "@/lib/google/drive";
import { logEvent } from "@/lib/events";
import { WorkflowError } from "@/lib/workflow";
import { canDelete } from "@/lib/policy";
import type { SessionUser } from "@/lib/auth-guard";

export async function getProcessBySlug(slug: string): Promise<Process | null> {
  const [p] = await db.select().from(processes).where(eq(processes.slug, slug));
  return p ?? null;
}

/** Ensure the Drive folder for a process exists; returns its folder id. */
export async function ensureProcessFolder(process: Process): Promise<string> {
  if (process.driveFolderId) return process.driveFolderId;
  const folderId = await ensureFolder(getRootId(), `${process.code} ${process.title}`);
  await db
    .update(processes)
    .set({ driveFolderId: folderId })
    .where(eq(processes.id, process.id));
  return folderId;
}

/** Ensure Drive folders for all processes (admin bootstrap). */
export async function ensureAllProcessFolders(): Promise<number> {
  const all = await db.select().from(processes).orderBy(processes.sortOrder);
  let created = 0;
  for (const p of all) {
    if (!p.driveFolderId) {
      await ensureProcessFolder(p);
      created++;
    }
  }
  return created;
}

/**
 * Landing-map flags per process slug:
 * - withDocs: has ≥1 uploaded document (→ shaded card background)
 * - withPublished: has ≥1 published document (→ green Output line)
 */
export async function getProcessDocFlags(): Promise<{
  withDocs: Set<string>;
  withPublished: Set<string>;
}> {
  const rows = await db
    .select({ slug: processes.slug, status: documents.status })
    .from(documents)
    .innerJoin(processes, eq(documents.processId, processes.id));

  const withDocs = new Set<string>();
  const withPublished = new Set<string>();
  for (const r of rows) {
    withDocs.add(r.slug);
    if (r.status === "published") withPublished.add(r.slug);
  }
  return { withDocs, withPublished };
}

export type PendingTask = {
  type: "review" | "approve";
  assigneeId: string;
};

export type DocumentListItem = {
  id: string;
  title: string;
  docCode: string | null;
  status: string;
  versionNo: number | null;
  versionLabel: string | null; // "1.0", "1.1", "2.0"
  currentVersionId: string | null;
  mimeType: string | null;
  fileName: string | null;
  updatedAt: Date;
  uploadedByName: string | null;
  createdBy: string;
  reviewerId: string | null;
  approverId: string | null;
  checkedOutBy: string | null;
  inRevision: boolean; // has a published effective copy but latest is not published
  pendingTask: PendingTask | null;
};

export function versionLabel(major: number, minor: number): string {
  return `${major}.${minor}`;
}

export async function listDocuments(processId: string): Promise<DocumentListItem[]> {
  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      docCode: documents.docCode,
      status: documents.status,
      updatedAt: documents.updatedAt,
      createdBy: documents.createdBy,
      reviewerId: documents.reviewerId,
      approverId: documents.approverId,
      checkedOutBy: documents.checkedOutBy,
      effectiveVersionId: documents.effectiveVersionId,
      currentVersionId: documents.currentVersionId,
      versionNo: documentVersions.versionNo,
      versionMajor: documentVersions.versionMajor,
      versionMinor: documentVersions.versionMinor,
      fileName: documentVersions.driveFileName,
      mimeType: documentVersions.mimeType,
      uploadedByName: users.name,
    })
    .from(documents)
    .leftJoin(documentVersions, eq(documents.currentVersionId, documentVersions.id))
    .leftJoin(users, eq(documentVersions.uploadedBy, users.id))
    .where(eq(documents.processId, processId))
    .orderBy(desc(documents.updatedAt));

  const ids = rows.map((r) => r.id);
  const pend = ids.length
    ? await db
        .select({
          documentId: workflowTasks.documentId,
          taskType: workflowTasks.taskType,
          assigneeId: workflowTasks.assigneeId,
        })
        .from(workflowTasks)
        .where(
          and(inArray(workflowTasks.documentId, ids), eq(workflowTasks.status, "pending")),
        )
    : [];
  const byDoc = new Map<string, PendingTask>();
  for (const t of pend) byDoc.set(t.documentId, { type: t.taskType, assigneeId: t.assigneeId });

  return rows.map((r) => ({
    ...r,
    versionLabel:
      r.versionMajor != null && r.versionMinor != null
        ? versionLabel(r.versionMajor, r.versionMinor)
        : null,
    inRevision: r.status !== "published" && r.effectiveVersionId != null,
    pendingTask: byDoc.get(r.id) ?? null,
  }));
}

export type VersionRow = {
  versionNo: number;
  versionLabel: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedByName: string | null;
  uploadedAt: Date;
  isCurrent: boolean;
};

export type DocumentDetail = {
  id: string;
  title: string;
  status: string;
  createdBy: string;
  reviewerId: string | null;
  approverId: string | null;
  processSlug: string;
  processTitle: string;
  versions: VersionRow[];
};

export async function getDocumentDetail(
  documentId: string,
): Promise<DocumentDetail | null> {
  const [d] = await db
    .select({
      id: documents.id,
      title: documents.title,
      status: documents.status,
      createdBy: documents.createdBy,
      reviewerId: documents.reviewerId,
      approverId: documents.approverId,
      processSlug: processes.slug,
      processTitle: processes.title,
    })
    .from(documents)
    .innerJoin(processes, eq(documents.processId, processes.id))
    .where(eq(documents.id, documentId));
  if (!d) return null;

  const rawVersions = await db
    .select({
      versionNo: documentVersions.versionNo,
      versionMajor: documentVersions.versionMajor,
      versionMinor: documentVersions.versionMinor,
      fileName: documentVersions.driveFileName,
      mimeType: documentVersions.mimeType,
      sizeBytes: documentVersions.sizeBytes,
      uploadedByName: users.name,
      uploadedAt: documentVersions.uploadedAt,
      isCurrent: documentVersions.isCurrent,
    })
    .from(documentVersions)
    .leftJoin(users, eq(documentVersions.uploadedBy, users.id))
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(desc(documentVersions.versionNo));

  const versions: VersionRow[] = rawVersions.map((v) => ({
    versionNo: v.versionNo,
    versionLabel: versionLabel(v.versionMajor, v.versionMinor),
    fileName: v.fileName,
    mimeType: v.mimeType,
    sizeBytes: v.sizeBytes,
    uploadedByName: v.uploadedByName,
    uploadedAt: v.uploadedAt,
    isCurrent: v.isCurrent,
  }));

  return { ...d, versions };
}

type FileInput = {
  name: string;
  mimeType: string;
  buffer: Buffer;
};

/** Check-in a brand new document (version 1) into a process. */
export async function checkInNewDocument(params: {
  process: Process;
  title: string;
  file: FileInput;
  userId: string;
}): Promise<{ documentId: string }> {
  const { process, title, file, userId } = params;
  const folderId = await ensureProcessFolder(process);

  const uploaded = await uploadFile(folderId, file.name, file.mimeType, file.buffer);

  const [doc] = await db
    .insert(documents)
    .values({ processId: process.id, title, status: "draft", createdBy: userId })
    .returning();

  const [ver] = await db
    .insert(documentVersions)
    .values({
      documentId: doc.id,
      versionNo: 1,
      driveFileId: uploaded.id,
      driveFileName: uploaded.name,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.size,
      uploadedBy: userId,
      isCurrent: true,
    })
    .returning();

  await db
    .update(documents)
    .set({ currentVersionId: ver.id, updatedAt: new Date() })
    .where(eq(documents.id, doc.id));

  await logEvent({
    entityType: "document",
    entityId: doc.id,
    documentId: doc.id,
    actorId: userId,
    action: "checked_in",
    toStatus: "draft",
    metadata: { versionNo: 1, fileName: uploaded.name, driveFileId: uploaded.id },
  });

  return { documentId: doc.id };
}

/** Add a new version to an existing document (re-check-in). */
export async function addNewVersion(params: {
  documentId: string;
  file: FileInput;
  userId: string;
}): Promise<{ versionNo: number }> {
  const { documentId, file, userId } = params;

  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc) throw new WorkflowError("ไม่พบเอกสาร");
  if (doc.status === "published") {
    throw new WorkflowError("เอกสารเผยแพร่แล้ว — ต้อง 'เช็คเอาต์แก้ไข' ก่อนสร้างเวอร์ชันใหม่");
  }

  const [proc] = await db.select().from(processes).where(eq(processes.id, doc.processId));
  if (!proc) throw new WorkflowError("ไม่พบกระบวนการ");
  const folderId = await ensureProcessFolder(proc);

  const [last] = await db
    .select({ versionNo: documentVersions.versionNo })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(desc(documentVersions.versionNo))
    .limit(1);
  const nextNo = (last?.versionNo ?? 0) + 1;

  // carry the current semantic label (same revision being iterated)
  let major = 1;
  let minor = 0;
  if (doc.currentVersionId) {
    const [cur] = await db
      .select({ major: documentVersions.versionMajor, minor: documentVersions.versionMinor })
      .from(documentVersions)
      .where(eq(documentVersions.id, doc.currentVersionId));
    if (cur) { major = cur.major; minor = cur.minor; }
  }

  const uploaded = await uploadFile(folderId, file.name, file.mimeType, file.buffer);

  // demote previous current versions
  await db
    .update(documentVersions)
    .set({ isCurrent: false })
    .where(and(eq(documentVersions.documentId, documentId), eq(documentVersions.isCurrent, true)));

  const [ver] = await db
    .insert(documentVersions)
    .values({
      documentId,
      versionNo: nextNo,
      versionMajor: major,
      versionMinor: minor,
      driveFileId: uploaded.id,
      driveFileName: uploaded.name,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.size,
      uploadedBy: userId,
      isCurrent: true,
    })
    .returning();

  const fromStatus = doc.status;
  // a new version resets the document to draft (needs re-review)
  await db
    .update(documents)
    .set({ currentVersionId: ver.id, status: "draft", updatedAt: new Date() })
    .where(eq(documents.id, documentId));

  await logEvent({
    entityType: "version",
    entityId: ver.id,
    documentId,
    actorId: userId,
    action: "version_added",
    fromStatus,
    toStatus: "draft",
    metadata: { versionNo: nextNo, fileName: uploaded.name, driveFileId: uploaded.id },
  });

  return { versionNo: nextNo };
}

/** Check-out a published document for revision (locks it). */
export async function checkOut(params: {
  documentId: string;
  userId: string;
  role: "admin" | "isms_manager" | "member";
}): Promise<void> {
  const { documentId, userId, role } = params;
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc) throw new WorkflowError("ไม่พบเอกสาร");
  if (doc.status !== "published") {
    throw new WorkflowError("เช็คเอาต์ได้เฉพาะเอกสารที่เผยแพร่แล้ว");
  }
  if (doc.checkedOutBy) throw new WorkflowError("เอกสารถูกเช็คเอาต์อยู่แล้ว");
  if (role !== "admin" && doc.createdBy !== userId) {
    throw new WorkflowError("เฉพาะผู้จัดทำหรือผู้ดูแลระบบเท่านั้นที่เช็คเอาต์ได้");
  }

  await db
    .update(documents)
    .set({ checkedOutBy: userId, checkedOutAt: new Date() })
    .where(eq(documents.id, documentId));

  await logEvent({
    entityType: "document",
    entityId: documentId,
    documentId,
    actorId: userId,
    action: "checked_out",
  });
}

/** Release a check-out without creating a new version. */
export async function cancelCheckOut(params: {
  documentId: string;
  userId: string;
  role: "admin" | "isms_manager" | "member";
}): Promise<void> {
  const { documentId, userId, role } = params;
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc) throw new WorkflowError("ไม่พบเอกสาร");
  if (!doc.checkedOutBy) return;
  if (role !== "admin" && doc.checkedOutBy !== userId) {
    throw new WorkflowError("ยกเลิกได้เฉพาะผู้ที่เช็คเอาต์หรือผู้ดูแลระบบ");
  }
  await db
    .update(documents)
    .set({ checkedOutBy: null, checkedOutAt: null })
    .where(eq(documents.id, documentId));

  await logEvent({
    entityType: "document",
    entityId: documentId,
    documentId,
    actorId: userId,
    action: "checkout_cancelled",
  });
}

/** Check-in a revision → new draft version at 1.x (minor) or 2.0 (major).
 *  The published copy (effectiveVersionId) stays live until the revision is
 *  itself published. */
export async function checkInRevision(params: {
  documentId: string;
  userId: string;
  role: "admin" | "isms_manager" | "member";
  file: FileInput;
  bump: "minor" | "major";
}): Promise<{ versionLabel: string }> {
  const { documentId, userId, role, file, bump } = params;

  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc) throw new WorkflowError("ไม่พบเอกสาร");
  if (!doc.checkedOutBy) throw new WorkflowError("ต้องเช็คเอาต์เอกสารก่อน");
  if (role !== "admin" && doc.checkedOutBy !== userId) {
    throw new WorkflowError("เฉพาะผู้ที่เช็คเอาต์เท่านั้นที่เช็คอินได้");
  }

  const [proc] = await db.select().from(processes).where(eq(processes.id, doc.processId));
  if (!proc) throw new WorkflowError("ไม่พบกระบวนการ");
  const folderId = await ensureProcessFolder(proc);

  // base label = the effective (published) version's label
  const baseId = doc.effectiveVersionId ?? doc.currentVersionId;
  let major = 1;
  let minor = 0;
  if (baseId) {
    const [base] = await db
      .select({ major: documentVersions.versionMajor, minor: documentVersions.versionMinor })
      .from(documentVersions)
      .where(eq(documentVersions.id, baseId));
    if (base) { major = base.major; minor = base.minor; }
  }
  if (bump === "major") { major += 1; minor = 0; } else { minor += 1; }

  const [last] = await db
    .select({ versionNo: documentVersions.versionNo })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(desc(documentVersions.versionNo))
    .limit(1);
  const nextNo = (last?.versionNo ?? 0) + 1;

  const uploaded = await uploadFile(folderId, file.name, file.mimeType, file.buffer);

  await db
    .update(documentVersions)
    .set({ isCurrent: false })
    .where(and(eq(documentVersions.documentId, documentId), eq(documentVersions.isCurrent, true)));

  const [ver] = await db
    .insert(documentVersions)
    .values({
      documentId,
      versionNo: nextNo,
      versionMajor: major,
      versionMinor: minor,
      driveFileId: uploaded.id,
      driveFileName: uploaded.name,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.size,
      uploadedBy: userId,
      isCurrent: true,
    })
    .returning();

  // enter revision: latest becomes draft; effective (published) copy unchanged
  await db
    .update(documents)
    .set({
      currentVersionId: ver.id,
      status: "draft",
      checkedOutBy: null,
      checkedOutAt: null,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));

  const label = versionLabel(major, minor);
  await logEvent({
    entityType: "version",
    entityId: ver.id,
    documentId,
    actorId: userId,
    action: "revision_checked_in",
    fromStatus: "published",
    toStatus: "draft",
    metadata: { versionLabel: label, bump, fileName: uploaded.name, driveFileId: uploaded.id },
  });

  return { versionLabel: label };
}

/** Delete a never-published draft document: trash its Drive files (all
 *  versions) then remove the document (versions/tasks cascade). */
export async function deleteDraftDocument(
  documentId: string,
  user: SessionUser,
): Promise<void> {
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc) throw new WorkflowError("ไม่พบเอกสาร", 404);
  if (!canDelete(doc, user)) {
    throw new WorkflowError("ลบได้เฉพาะเอกสารร่างที่ยังไม่เคยเผยแพร่ (โดยผู้จัดทำหรือผู้ดูแล)", 403);
  }

  const versions = await db
    .select({ driveFileId: documentVersions.driveFileId })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId));

  // move Drive files to trash (best-effort; recoverable)
  for (const v of versions) {
    await trashFile(v.driveFileId).catch(() => {});
  }

  await logEvent({
    entityType: "document",
    entityId: documentId,
    documentId,
    actorId: user.id,
    action: "deleted",
    fromStatus: doc.status,
    metadata: { title: doc.title, versions: versions.length },
  });

  await db.delete(documents).where(eq(documents.id, documentId));
}
