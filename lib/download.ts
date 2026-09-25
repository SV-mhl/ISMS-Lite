// Build a watermarked PDF for download. Enforces PDF-only + access rules.
// A document may have an EFFECTIVE (published) copy and a newer WORKING draft
// (during a revision). By default we serve the effective copy (public to all);
// `which="working"` serves the latest draft (involved users only).
// The editable original is never served — only a converted, watermarked PDF.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, documentVersions } from "@/lib/db/schema";
import { exportToPdf } from "@/lib/google/drive";
import { watermarkPdf } from "@/lib/pdf";
import { logEvent } from "@/lib/events";
import { AuthError, type SessionUser } from "@/lib/auth-guard";
import { canDownload, watermarkMainText } from "@/lib/policy";

export async function buildDocumentPdf(
  documentId: string,
  user: SessionUser,
  which: "effective" | "working" = "effective",
): Promise<{ buffer: Buffer; filename: string }> {
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc) throw new AuthError("ไม่พบเอกสาร", 404);

  const wantWorking = which === "working";
  const versionId = wantWorking
    ? doc.currentVersionId
    : (doc.effectiveVersionId ?? doc.currentVersionId);
  if (!versionId) throw new AuthError("เอกสารยังไม่มีไฟล์", 404);

  // Serving the effective/published copy is public; the working draft follows
  // the involved-only rule.
  const servingPublished =
    !wantWorking && (doc.effectiveVersionId != null || doc.status === "published");
  if (!servingPublished && !canDownload(doc, user)) {
    throw new AuthError("คุณไม่มีสิทธิ์ดาวน์โหลดเอกสารนี้", 403);
  }

  const [ver] = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.id, versionId));
  if (!ver) throw new AuthError("ไม่พบเวอร์ชันเอกสาร", 404);
  if (ver.docKind === "url" || !ver.driveFileId) {
    throw new AuthError("เอกสารนี้เป็นลิงก์ URL — เปิดลิงก์แทนการดาวน์โหลด PDF", 400);
  }

  const raw = await exportToPdf(ver.driveFileId, ver.mimeType ?? "application/pdf");

  const label = `${ver.versionMajor}.${ver.versionMinor}`;
  const mainText = servingPublished ? "CONTROLLED COPY" : watermarkMainText(doc.status);
  const stamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  const footer = `ISMS-Lite MAHOLAN  |  ${user.email}  |  ${stamp} UTC  |  v${label} (${servingPublished ? "effective" : doc.status})`;

  const buffer = await watermarkPdf(raw, { mainText, footer });

  await logEvent({
    entityType: "document",
    entityId: documentId,
    documentId,
    actorId: user.id,
    action: "downloaded",
    metadata: { versionLabel: label, which: servingPublished ? "effective" : "working", format: "pdf" },
  });

  const safeTitle = doc.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
  return { buffer, filename: `${safeTitle} v${label}.pdf` };
}
