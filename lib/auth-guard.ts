import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: "admin" | "member";
};

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/** Get the current user or throw AuthError (401). */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id) throw new AuthError("กรุณาเข้าสู่ระบบ", 401);
  return {
    id: u.id,
    email: u.email ?? "",
    name: u.name,
    role: u.role ?? "member",
  };
}

/** Get the current admin or throw AuthError (401/403). */
export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "admin") throw new AuthError("ต้องมีสิทธิ์ผู้ดูแลระบบ", 403);
  return u;
}
