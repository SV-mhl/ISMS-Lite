import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth-guard";
import { checkInRevision } from "@/lib/documents";
import { errorResponse } from "@/lib/api-error";

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
    const bump = form.get("bump") === "major" ? "major" : "minor";
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "กรุณาแนบไฟล์" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 25 MB" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await checkInRevision({
      documentId: id,
      userId: user.id,
      role: user.role,
      file: { name: file.name, mimeType: file.type || "application/octet-stream", buffer },
      bump,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return errorResponse(err);
  }
}
