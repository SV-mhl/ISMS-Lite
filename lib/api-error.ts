import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth-guard";
import { WorkflowError } from "@/lib/workflow";
import { DriveConfigError } from "@/lib/google/drive";

/** Map known domain errors to JSON responses; log + 500 otherwise. */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof AuthError || err instanceof WorkflowError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof DriveConfigError) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }
  console.error("API error:", err);
  return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
}
