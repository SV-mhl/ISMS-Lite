import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth-guard";
import { reviewApprove } from "@/lib/workflow";
import { errorResponse } from "@/lib/api-error";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    await reviewApprove({ documentId: id, userId: user.id, comment: body.comment });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
