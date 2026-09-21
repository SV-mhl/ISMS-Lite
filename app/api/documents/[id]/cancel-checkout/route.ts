import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth-guard";
import { cancelCheckOut } from "@/lib/documents";
import { errorResponse } from "@/lib/api-error";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await cancelCheckOut({ documentId: id, userId: user.id, role: user.role });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
