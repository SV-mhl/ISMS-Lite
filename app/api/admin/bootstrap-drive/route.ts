import { NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth-guard";
import { ensureAllProcessFolders } from "@/lib/documents";
import { DriveConfigError } from "@/lib/google/drive";

export async function POST() {
  try {
    await requireAdmin();
    const created = await ensureAllProcessFolders();
    return NextResponse.json({ ok: true, foldersCreated: created });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof DriveConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("bootstrap-drive failed:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการสร้างโฟลเดอร์" }, { status: 500 });
  }
}
