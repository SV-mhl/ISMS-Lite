// Returns a valid Google access token for a user, refreshing via the stored
// refresh token when expired. Used by backend Drive operations (Step 3+).

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { googleAccounts } from "@/lib/db/schema";

export class GoogleAuthError extends Error {}

export async function getValidAccessToken(userId: string): Promise<string> {
  const [acct] = await db
    .select()
    .from(googleAccounts)
    .where(eq(googleAccounts.userId, userId));

  if (!acct) throw new GoogleAuthError("ยังไม่ได้เชื่อมบัญชี Google");

  const now = Date.now();
  const exp = acct.expiresAt ? acct.expiresAt.getTime() : 0;
  // 60s buffer
  if (acct.accessToken && exp - 60_000 > now) return acct.accessToken;

  if (!acct.refreshToken) {
    throw new GoogleAuthError("ไม่มี refresh token — กรุณาเข้าสู่ระบบใหม่");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      grant_type: "refresh_token",
      refresh_token: acct.refreshToken,
    }),
  });

  if (!res.ok) {
    throw new GoogleAuthError(
      `รีเฟรช Google token ไม่สำเร็จ (${res.status})`,
    );
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  const newExp = new Date(Date.now() + data.expires_in * 1000);

  await db
    .update(googleAccounts)
    .set({ accessToken: data.access_token, expiresAt: newExp, updatedAt: new Date() })
    .where(eq(googleAccounts.userId, userId));

  return data.access_token;
}
