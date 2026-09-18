import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. See .env.example");
}

// Reuse the client across hot-reloads in dev to avoid exhausting connections.
const globalForDb = globalThis as unknown as {
  __ismsPg?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__ismsPg ??
  postgres(databaseUrl, {
    max: process.env.NODE_ENV === "production" ? 10 : 5,
    prepare: false, // safe for pooled/serverless (Neon) connections
  });

if (process.env.NODE_ENV !== "production") globalForDb.__ismsPg = client;

export const db = drizzle(client, { schema });
export { schema };
