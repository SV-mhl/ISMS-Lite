import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, googleAccounts } from "@/lib/db/schema";

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? "maholan.co.th";
// drive.file = เข้าถึงเฉพาะไฟล์ที่แอปสร้าง/เปิด (ปลอดภัยสุดสำหรับ Step 3+)
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          scope: `openid email profile ${DRIVE_SCOPE}`,
          access_type: "offline", // → refresh token
          prompt: "consent", // บังคับให้ได้ refresh token ทุกครั้ง
          hd: ALLOWED_DOMAIN, // hint ให้เลือกบัญชีองค์กร
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    // Gate: อนุญาตเฉพาะอีเมล @maholan.co.th ที่ยืนยันแล้ว
    async signIn({ profile }) {
      const email = profile?.email;
      const verified = (profile as { email_verified?: boolean } | undefined)
        ?.email_verified;
      if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) return false;
      if (verified === false) return false;
      return true;
    },

    async jwt({ token, account, profile }) {
      // ครั้งแรกที่ login: upsert user + เก็บ Google tokens
      if (account && profile?.email) {
        const [u] = await db
          .insert(users)
          .values({
            email: profile.email,
            name: (profile.name as string | undefined) ?? null,
            avatarUrl: (profile as { picture?: string }).picture ?? null,
            googleSub: profile.sub ?? null,
          })
          .onConflictDoUpdate({
            target: users.email,
            set: {
              name: (profile.name as string | undefined) ?? null,
              avatarUrl: (profile as { picture?: string }).picture ?? null,
              googleSub: profile.sub ?? null,
            },
          })
          .returning();

        token.uid = u.id;
        token.role = u.role;

        const expiresAt = account.expires_at
          ? new Date(account.expires_at * 1000)
          : null;

        // เก็บ token ลง DB (อัปเดต refreshToken เฉพาะเมื่อได้ค่ามาใหม่)
        await db
          .insert(googleAccounts)
          .values({
            userId: u.id,
            accessToken: account.access_token ?? null,
            refreshToken: account.refresh_token ?? null,
            expiresAt,
            scope: account.scope ?? null,
          })
          .onConflictDoUpdate({
            target: googleAccounts.userId,
            set: {
              accessToken: account.access_token ?? null,
              ...(account.refresh_token
                ? { refreshToken: account.refresh_token }
                : {}),
              expiresAt,
              scope: account.scope ?? null,
              updatedAt: new Date(),
            },
          });
      }

      // refresh role จาก DB ทุกครั้ง เผื่อถูกโปรโมท/ลดสิทธิ์ (ไม่ต้อง login ใหม่)
      if (!account && token.uid) {
        const [u] = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, token.uid as string));
        if (u) token.role = u.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (token.uid) session.user.id = token.uid as string;
      if (token.role) session.user.role = token.role as "admin" | "member";
      return session;
    },
  },
});
