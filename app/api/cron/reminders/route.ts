import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { runReminders } from "@/lib/reminders";

// Called daily by Vercel Cron (Authorization: Bearer CRON_SECRET), or manually
// by an authenticated admin (the "run reminders now" button).
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authz = req.headers.get("authorization");
  let ok = Boolean(secret && authz === `Bearer ${secret}`);
  if (!ok) {
    const session = await auth();
    const role = session?.user?.role;
    ok = role === "admin" || role === "isms_manager";
  }
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const result = await runReminders();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
