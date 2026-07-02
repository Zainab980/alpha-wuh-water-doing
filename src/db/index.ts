/**
 * The database connection, created once and shared everywhere.
 *
 * `neon(...)` opens a lightweight HTTP connection to our Neon Postgres using
 * the secret address in DATABASE_URL. `drizzle(...)` wraps it so we can write
 * type-checked queries against the tables in schema.ts.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local");
}

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });
