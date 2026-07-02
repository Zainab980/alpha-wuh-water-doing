/**
 * Config for the `drizzle-kit` command-line tool.
 *
 * It reads our schema.ts and compares it to the real database, then creates or
 * updates tables to match. We load .env.local first so it can find DATABASE_URL
 * (the CLI doesn't read Next.js env files on its own).
 */
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
