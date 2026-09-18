import { NextResponse, type NextRequest } from "next/server";
import { requireUser, AuthError } from "@/lib/auth-guard";
import { getProcessBySlug, checkInNewDocument } from "@/lib/documents";
import { DriveConfigError } from "@/lib/google/drive";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireUser();
    const { slug } = await params;

    const process = await getProcessBySlug(slug);
    if (!process) {
      return NextResponse.json({ error: "ไม่พบกระบวนการ" }, { status: 404 });
    }

    const form = await req.formData();
    const title = String(form.get("title") ?? "").trim();
    const file = form.get("file");

    if (!title) {
      return NextResponse.json({ error: "กรุณาระบุชื่อเอกสาร" }, { status: 400 });
    }
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "กรุณาแนบไฟล์" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 25 MB" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await checkInNewDocument({
      process,
      title,
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
    console.error("check-in failed:", err);
    return NextResponse.json({ error: "อัปโหลดไม่สำเร็จ" }, { status: 500 });
  }
}
