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
import { ensureFolder, getRootId, uploadFile } from "@/lib/google/drive";
import { logEvent } from "@/lib/events";

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
  currentVersionId: string | null;
  mimeType: string | null;
  fileName: string | null;
  updatedAt: Date;
  uploadedByName: string | null;
  createdBy: string;
  reviewerId: string | null;
  approverId: string | null;
  pendingTask: PendingTask | null;
};

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
      currentVersionId: documents.currentVersionId,
      versionNo: documentVersions.versionNo,
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

  return rows.map((r) => ({ ...r, pendingTask: byDoc.get(r.id) ?? null }));
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
  if (!doc) throw new Error("ไม่พบเอกสาร");

  const [proc] = await db.select().from(processes).where(eq(processes.id, doc.processId));
  if (!proc) throw new Error("ไม่พบกระบวนการ");
  const folderId = await ensureProcessFolder(proc);

  const [last] = await db
    .select({ versionNo: documentVersions.versionNo })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(desc(documentVersions.versionNo))
    .limit(1);
  const nextNo = (last?.versionNo ?? 0) + 1;

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
