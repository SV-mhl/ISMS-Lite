// Set a user's role. Run: npm run set-role -- <email> <admin|isms_manager|member>

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const ROLES = ["admin", "isms_manager", "member"] as const;

async function main() {
  const email = process.argv[2];
  const role = process.argv[3];
  if (!email || !role) {
    console.error("Usage: npm run set-role -- <email> <admin|isms_manager|member>");
    process.exit(1);
  }
  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    console.error(`Invalid role "${role}". Must be one of: ${ROLES.join(", ")}`);
    process.exit(1);
  }

  const { db } = await import("./index");
  const { users } = await import("./schema");
  const { eq } = await import("drizzle-orm");

  const rows = await db
    .update(users)
    .set({ role: role as (typeof ROLES)[number] })
    .where(eq(users.email, email))
    .returning({ email: users.email, role: users.role });

  if (rows.length === 0) {
    console.error(`ไม่พบผู้ใช้อีเมล ${email} (ต้องล็อกอินครั้งแรกก่อน)`);
    process.exit(1);
  }
  console.log(`✓ ตั้ง role แล้ว: ${rows[0].email} → ${rows[0].role}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("set-role failed:", err);
  process.exit(1);
});
