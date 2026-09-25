import { NextResponse, type NextRequest } from "next/server";
import { requireUser, AuthError } from "@/lib/auth-guard";
import { getProcessBySlug, checkInNewDocument, checkInNewUrlDocument } from "@/lib/documents";
import { DriveConfigError } from "@/lib/google/drive";
import { isUrlCheckinEnabled } from "@/lib/feature-flags";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

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
    const docType = String(form.get("docType") ?? "file");

    if (!title) {
      return NextResponse.json({ error: "กรุณาระบุชื่อเอกสาร" }, { status: 400 });
    }

    if (docType === "url") {
      if (!isUrlCheckinEnabled(slug)) {
        return NextResponse.json(
          { error: "กระบวนการนี้ยังไม่เปิดใช้งานการเช็คอินแบบลิงก์ URL" },
          { status: 403 },
        );
      }
      const url = String(form.get("url") ?? "").trim();
      if (!url || !isValidHttpUrl(url)) {
        return NextResponse.json({ error: "กรุณาระบุ URL ที่ถูกต้อง (http/https)" }, { status: 400 });
      }
      const result = await checkInNewUrlDocument({ process, title, url, userId: user.id });
      return NextResponse.json({ ok: true, ...result });
    }

    const file = form.get("file");
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
