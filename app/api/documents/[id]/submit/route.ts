import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth-guard";
import { submitForReview } from "@/lib/workflow";
import { errorResponse } from "@/lib/api-error";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    await submitForReview({
      documentId: id,
      reviewerId: String(body.reviewerId ?? ""),
      approverId: String(body.approverId ?? ""),
      userId: user.id,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
