import { NextResponse, type NextRequest } from "next/server";
import { requireManager } from "@/lib/auth-guard";
import { updateLeadDays } from "@/lib/calendar";
import { errorResponse } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    await requireManager();
    const body = await req.json();
    const itemId = String(body.itemId ?? "");
    const leadDays = Number(body.leadDays);
    if (!itemId || Number.isNaN(leadDays)) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }
    await updateLeadDays(itemId, leadDays);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
