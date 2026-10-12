// Shared (client + server safe) registry of file types ISMS-Lite accepts at
// check-in — i.e. everything the PDF-export pipeline (lib/google/drive.ts
// exportToPdf + lib/pdf.ts) can actually turn into a watermarked PDF. No
// server-only deps here, so client components may import this too.

export class UnsupportedFileTypeError extends Error {
  status = 400;
  constructor(mimeType: string) {
    super(
      `ไฟล์ชนิด "${mimeType || "ไม่ทราบชนิด"}" ไม่รองรับ — อัปโหลดได้เฉพาะ PDF, รูปภาพ (JPG/PNG), Word, Excel หรือ PowerPoint`,
    );
  }
}

/** Office MIME type -> the Google Workspace type Drive converts it to for PDF export. */
export const OFFICE_MIME_TO_GOOGLE: Record<string, string> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "application/vnd.google-apps.document",
  "application/msword": "application/vnd.google-apps.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "application/vnd.google-apps.spreadsheet",
  "application/vnd.ms-excel": "application/vnd.google-apps.spreadsheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "application/vnd.google-apps.presentation",
  "application/vnd.ms-powerpoint": "application/vnd.google-apps.presentation",
};

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png"];

export const ACCEPTED_CHECKIN_MIME_TYPES: string[] = [
  "application/pdf",
  ...IMAGE_MIME_TYPES,
  ...Object.keys(OFFICE_MIME_TO_GOOGLE),
];

/** For the file picker's `accept` attribute. */
export const ACCEPTED_CHECKIN_ACCEPT_ATTR =
  ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx";

/** Throws UnsupportedFileTypeError if mimeType isn't one we can export to PDF. */
export function assertAcceptedCheckinMimeType(mimeType: string): void {
  if (!ACCEPTED_CHECKIN_MIME_TYPES.includes(mimeType)) {
    throw new UnsupportedFileTypeError(mimeType);
  }
}
