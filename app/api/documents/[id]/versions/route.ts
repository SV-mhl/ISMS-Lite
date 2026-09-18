import { NextResponse, type NextRequest } from "next/server";
import { requireUser, AuthError } from "@/lib/auth-guard";
import { addNewVersion } from "@/lib/documents";
import { DriveConfigError } from "@/lib/google/drive";

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "กรุณาแนบไฟล์" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 25 MB" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await addNewVersion({
      documentId: id,
      file: {
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        buffer,
      },
      userId: user.id,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof DriveConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("add-version failed:", err);
    return NextResponse.json({ error: "อัปโหลดเวอร์ชันใหม่ไม่สำเร็จ" }, { status: 500 });
  }
}
