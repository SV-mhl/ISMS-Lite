import { NextResponse, type NextRequest } from "next/server";
import { requireManager } from "@/lib/auth-guard";
import { setAllProcessDefaults } from "@/lib/assignees";
import { errorResponse } from "@/lib/api-error";

/** Apply the same default reviewer/approver to ALL processes. */
export async function POST(req: NextRequest) {
  try {
    await requireManager();
    const body = await req.json();
    await setAllProcessDefaults(body.reviewerId || null, body.approverId || null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
