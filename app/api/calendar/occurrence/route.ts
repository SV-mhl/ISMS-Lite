import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { setOccurrenceDone } from "@/lib/calendar";
import { errorResponse } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const occId = String(body.occId ?? "");
    const done = Boolean(body.done);
    if (!occId) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
    await setOccurrenceDone(occId, admin.id, done);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
