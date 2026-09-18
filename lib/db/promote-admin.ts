// Promote a user to admin by email.
// Run: npm run promote-admin -- someone@maholan.co.th

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run promote-admin -- <email>");
    process.exit(1);
  }

  const { db } = await import("./index");
  const { users } = await import("./schema");
  const { eq } = await import("drizzle-orm");

  const rows = await db
    .update(users)
    .set({ role: "admin" })
    .where(eq(users.email, email))
    .returning({ id: users.id, email: users.email, role: users.role });

  if (rows.length === 0) {
    console.error(`ไม่พบผู้ใช้อีเมล ${email} (ต้องล็อกอินครั้งแรกก่อน)`);
    process.exit(1);
  }

  console.log(`✓ โปรโมทเป็น admin แล้ว: ${rows[0].email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("promote-admin failed:", err);
  process.exit(1);
});
