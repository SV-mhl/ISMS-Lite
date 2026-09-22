import { NextResponse, type NextRequest } from "next/server";
import { requireManager } from "@/lib/auth-guard";
import { importPlanYear } from "@/lib/calendar";
import { errorResponse } from "@/lib/api-error";

const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    await requireManager();
    const form = await req.formData();
    const file = form.get("file");
    const year = Number(form.get("year"));
    const force = form.get("force") === "true";

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "กรุณาแนบไฟล์ PDF ปฏิทิน" }, { status: 400 });
    }
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json({ error: "รองรับเฉพาะไฟล์ .pdf" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 15 MB" }, { status: 413 });
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "ปีไม่ถูกต้อง (ค.ศ. เช่น 2027)" }, { status: 400 });
    }

    // NOTE (stub): the uploaded PDF bytes are validated but not parsed.
    // The plan is generated from the shared template shifted to `year`.
    try {
      const result = await importPlanYear(year, { force });
      return NextResponse.json({ ok: true, year, ...result });
    } catch (err) {
      const e = err as Error & { code?: string; existingCount?: number };
      if (e.code === "PLAN_EXISTS") {
        return NextResponse.json(
          { error: e.message, code: "PLAN_EXISTS", existingCount: e.existingCount, year },
          { status: 409 },
        );
      }
      throw err;
    }
  } catch (err) {
    return errorResponse(err);
  }
}
