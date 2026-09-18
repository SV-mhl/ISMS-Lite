// Seed the 18 ISO 27001 processes (Y01–Y17) from the blueprint.
// Idempotent: safe to run repeatedly. Platform modules (Y18–Y20) are
// app menus, not document processes, so they are not seeded here.
//
// Run: npm run db:seed

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  // Dynamic imports so dotenv runs before ./index reads DATABASE_URL
  // (static ESM imports are hoisted above the config() calls above).
  const { db } = await import("./index");
  const { processes } = await import("./schema");
  const { phases } = await import("../blueprint");

  const rows = phases
    .filter((p) => p.key !== "plat")
    .flatMap((p) =>
      p.modules.map((m) => ({
        code: m.code,
        slug: m.id,
        no: m.no,
        phaseKey: p.key,
        title: m.title,
        subtitle: m.subtitle,
        sortOrder: m.no,
      })),
    );

  console.log(`Seeding ${rows.length} processes...`);

  for (const row of rows) {
    await db
      .insert(processes)
      .values(row)
      .onConflictDoUpdate({
        target: processes.code,
        set: {
          slug: row.slug,
          no: row.no,
          phaseKey: row.phaseKey,
          title: row.title,
          subtitle: row.subtitle,
          sortOrder: row.sortOrder,
        },
      });
    console.log(`  ✓ ${row.code} ${row.title}`);
  }

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
