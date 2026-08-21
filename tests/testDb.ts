import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { pushSchema } from "drizzle-kit/api";
import * as schema from "@/lib/schema";

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

/**
 * A fresh, isolated Postgres per call, schema pushed straight from
 * lib/schema.ts (never from the stale drizzle/ migrations folder — see
 * CLAUDE.md). In-memory PGlite, so this needs no Docker and no network.
 */
export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  const { apply } = await pushSchema(schema, db as never);
  await apply();
  return db;
}
