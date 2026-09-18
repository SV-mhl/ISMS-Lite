// Google Drive service layer (Service Account + Shared Drive).
// The service account is a member of the "ISMS Repository" Shared Drive and
// performs ALL Drive operations. App users are NOT members of the Shared
// Drive, so they have no direct Drive access — that is what makes the
// "published → PDF only" rule enforceable (Step 6).

import { google, type drive_v3 } from "googleapis";
import { Readable } from "node:stream";

export class DriveConfigError extends Error {}

let cached: { drive: drive_v3.Drive; driveId: string } | null = null;

function getConfig(): { drive: drive_v3.Drive; driveId: string } {
  if (cached) return cached;

  const b64 = process.env.GOOGLE_SA_KEY_B64;
  const driveId = process.env.ISMS_SHARED_DRIVE_ID;
  if (!b64 || !driveId) {
    throw new DriveConfigError(
      "ยังไม่ได้ตั้งค่า Google Drive (GOOGLE_SA_KEY_B64 / ISMS_SHARED_DRIVE_ID) — ดู docs/STEP3-DRIVE-SETUP.md",
    );
  }

  let key: { client_email: string; private_key: string };
  try {
    key = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  } catch {
    throw new DriveConfigError("GOOGLE_SA_KEY_B64 ไม่ใช่ base64 ของไฟล์ JSON key ที่ถูกต้อง");
  }

  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  cached = { drive: google.drive({ version: "v3", auth }), driveId };
  return cached;
}

export function isDriveConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SA_KEY_B64 && process.env.ISMS_SHARED_DRIVE_ID);
}

const FOLDER_MIME = "application/vnd.google-apps.folder";

// Shared-drive params required on every call.
const sharedParams = { supportsAllDrives: true } as const;

/** Find a folder by name under a parent (idempotent helper). */
async function findFolder(parentId: string, name: string): Promise<string | null> {
  const { drive, driveId } = getConfig();
  const escaped = name.replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `'${parentId}' in parents and name = '${escaped}' and mimeType = '${FOLDER_MIME}' and trashed = false`,
    fields: "files(id,name)",
    corpora: "drive",
    driveId,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    pageSize: 1,
  });
  return res.data.files?.[0]?.id ?? null;
}

async function createFolder(parentId: string, name: string): Promise<string> {
  const { drive } = getConfig();
  const res = await drive.files.create({
    requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
    fields: "id",
    ...sharedParams,
  });
  return res.data.id!;
}

/** Ensure a folder exists under a parent; returns its id. */
export async function ensureFolder(parentId: string, name: string): Promise<string> {
  return (await findFolder(parentId, name)) ?? (await createFolder(parentId, name));
}

/** The Shared Drive root id (folders for processes are created here). */
export function getRootId(): string {
  return getConfig().driveId;
}

export type UploadedFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  webViewLink: string | null;
};

/** Upload a file into a folder (a "check-in"). */
export async function uploadFile(
  parentFolderId: string,
  name: string,
  mimeType: string,
  buffer: Buffer,
): Promise<UploadedFile> {
  const { drive } = getConfig();
  const res = await drive.files.create({
    requestBody: { name, parents: [parentFolderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id,name,mimeType,size,webViewLink",
    ...sharedParams,
  });
  const f = res.data;
  return {
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType ?? mimeType,
    size: Number(f.size ?? buffer.length),
    webViewLink: f.webViewLink ?? null,
  };
}

export async function getFileMeta(fileId: string) {
  const { drive } = getConfig();
  const res = await drive.files.get({
    fileId,
    fields: "id,name,mimeType,size,webViewLink,trashed",
    ...sharedParams,
  });
  return res.data;
}

/** Download raw file bytes. */
export async function downloadFileBuffer(fileId: string): Promise<Buffer> {
  const { drive } = getConfig();
  const res = await drive.files.get(
    { fileId, alt: "media", ...sharedParams },
    { responseType: "arraybuffer" },
  );
  return Buffer.from(res.data as ArrayBuffer);
}

// Office → Google format mapping for PDF conversion.
const OFFICE_TO_GOOGLE: Record<string, string> = {
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

/**
 * Render any supported file to PDF bytes.
 * - PDF → passthrough
 * - Google-native (docs/sheets/slides) → export
 * - Office → copy-convert to Google format, export, delete temp copy
 * Used by the published PDF-only download (Step 6).
 */
export async function exportToPdf(
  fileId: string,
  mimeType: string,
): Promise<Buffer> {
  const { drive } = getConfig();

  if (mimeType === "application/pdf") {
    return downloadFileBuffer(fileId);
  }

  if (mimeType.startsWith("application/vnd.google-apps")) {
    const res = await drive.files.export(
      { fileId, mimeType: "application/pdf" },
      { responseType: "arraybuffer" },
    );
    return Buffer.from(res.data as ArrayBuffer);
  }

  const googleType = OFFICE_TO_GOOGLE[mimeType];
  if (googleType) {
    // copy with conversion
    const copy = await drive.files.copy({
      fileId,
      requestBody: { mimeType: googleType },
      fields: "id",
      ...sharedParams,
    });
    const tempId = copy.data.id!;
    try {
      const res = await drive.files.export(
        { fileId: tempId, mimeType: "application/pdf" },
        { responseType: "arraybuffer" },
      );
      return Buffer.from(res.data as ArrayBuffer);
    } finally {
      await drive.files.delete({ fileId: tempId, ...sharedParams }).catch(() => {});
    }
  }

  throw new DriveConfigError(`ไม่รองรับการแปลงเป็น PDF สำหรับชนิดไฟล์ ${mimeType}`);
}

/** Move a file to trash. */
export async function trashFile(fileId: string): Promise<void> {
  const { drive } = getConfig();
  await drive.files.update({ fileId, requestBody: { trashed: true }, ...sharedParams });
}
