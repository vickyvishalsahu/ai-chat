import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import type { Database } from "./client.js";
import * as schema from "./schema.js";

const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));

// In-process Postgres for tests and credential-free local dev. Applies the
// same committed migrations as Neon, so the schema can't drift between them.
export async function createMemoryDb(): Promise<Database> {
  const db = drizzle({ client: new PGlite(), schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}
