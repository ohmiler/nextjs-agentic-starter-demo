import { defineConfig } from "drizzle-kit";

const url =
  process.env.TURSO_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "file:data/club.db";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
