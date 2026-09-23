import { NextResponse, type NextRequest } from "next/server";
import { requireManager } from "@/lib/auth-guard";
import { getProcessBySlug } from "@/lib/documents";
import { setProcessDefault } from "@/lib/assignees";
import { errorResponse } from "@/lib/api-error";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireManager();
    const { slug } = await params;
    const process = await getProcessBySlug(slug);
    if (!process) {
      return NextResponse.json({ error: "ไม่พบกระบวนการ" }, { status: 404 });
    }
    const body = await req.json();
    const reviewerId = body.reviewerId || null;
    const approverId = body.approverId || null;
    if (reviewerId && approverId && reviewerId === approverId) {
      return NextResponse.json(
        { error: "ผู้ตรวจและผู้อนุมัติต้องเป็นคนละคน (แยกหน้าที่)" },
        { status: 400 },
      );
    }
    await setProcessDefault(process.id, "reviewer", reviewerId, user.id);
    await setProcessDefault(process.id, "approver", approverId, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
