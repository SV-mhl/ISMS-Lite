// Build a watermarked PDF for download. Enforces PDF-only + access rules:
// - Published documents → any authenticated user
// - Non-published → author / assigned reviewer / assigned approver / admin
//   (so they can read it during the workflow)
// The editable original is never served — only a converted, watermarked PDF.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, documentVersions } from "@/lib/db/schema";
import { exportToPdf } from "@/lib/google/drive";
import { watermarkPdf } from "@/lib/pdf";
import { logEvent } from "@/lib/events";
import { AuthError, type SessionUser } from "@/lib/auth-guard";

export async function buildDocumentPdf(
  documentId: string,
  user: SessionUser,
): Promise<{ buffer: Buffer; filename: string }> {
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc) throw new AuthError("ไม่พบเอกสาร", 404);
  if (!doc.currentVersionId) throw new AuthError("เอกสารยังไม่มีไฟล์", 404);

  const allowed =
    doc.status === "published" ||
    user.role === "admin" ||
    [doc.createdBy, doc.reviewerId, doc.approverId].includes(user.id);
  if (!allowed) throw new AuthError("คุณไม่มีสิทธิ์ดาวน์โหลดเอกสารนี้", 403);

  const [ver] = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.id, doc.currentVersionId));
  if (!ver) throw new AuthError("ไม่พบเวอร์ชันเอกสาร", 404);

  const raw = await exportToPdf(ver.driveFileId, ver.mimeType ?? "application/pdf");

  const mainText =
    doc.status === "published" ? "CONTROLLED COPY" : "DRAFT - NOT FOR DISTRIBUTION";
  const stamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  const footer = `ISMS-Lite MAHOLAN  |  ${user.email}  |  ${stamp} UTC  |  status:${doc.status} v${ver.versionNo}`;

  const buffer = await watermarkPdf(raw, { mainText, footer });

  await logEvent({
    entityType: "document",
    entityId: documentId,
    documentId,
    actorId: user.id,
    action: "downloaded",
    metadata: { versionNo: ver.versionNo, format: "pdf", status: doc.status },
  });

  const safeTitle = doc.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
  return { buffer, filename: `${safeTitle} v${ver.versionNo}.pdf` };
}
