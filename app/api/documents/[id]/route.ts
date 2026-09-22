import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth-guard";
import { deleteDraftDocument } from "@/lib/documents";
import { errorResponse } from "@/lib/api-error";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await deleteDraftDocument(id, user);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
