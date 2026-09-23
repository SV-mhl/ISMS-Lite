import { NextResponse, type NextRequest } from "next/server";
import { requireManager } from "@/lib/auth-guard";
import { setAllProcessDefaults, AssigneeError } from "@/lib/assignees";
import { errorResponse } from "@/lib/api-error";

/** Apply the same default reviewer/approver to ALL processes. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireManager();
    const body = await req.json();
    await setAllProcessDefaults(body.reviewerId || null, body.approverId || null, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AssigneeError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return errorResponse(err);
  }
}
