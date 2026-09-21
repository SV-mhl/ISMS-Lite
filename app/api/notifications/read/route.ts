import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-guard";
import { markAllRead } from "@/lib/notify";
import { errorResponse } from "@/lib/api-error";

export async function POST() {
  try {
    const user = await requireUser();
    await markAllRead(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
