import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getProcessBySlug } from "@/lib/documents";
import { setProcessDefault } from "@/lib/assignees";
import { errorResponse } from "@/lib/api-error";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await requireAdmin();
    const { slug } = await params;
    const process = await getProcessBySlug(slug);
    if (!process) {
      return NextResponse.json({ error: "ไม่พบกระบวนการ" }, { status: 404 });
    }
    const body = await req.json();
    await setProcessDefault(process.id, "reviewer", body.reviewerId || null);
    await setProcessDefault(process.id, "approver", body.approverId || null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
