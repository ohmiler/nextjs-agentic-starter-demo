import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

export type Db = LibSQLDatabase<typeof schema>;

let db: Db | null = null;

function getTursoUrl(): string {
  return (
    process.env.TURSO_DATABASE_URL ??
    process.env.DATABASE_URL ??
    "file:data/club.db"
  );
}

function createTursoClient(): Client {
  const url = getTursoUrl();
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url.startsWith("libsql:") && !authToken) {
    throw new Error(
      "TURSO_AUTH_TOKEN is required when using a remote libsql:// URL",
    );
  }

  return createClient({
    url,
    authToken: authToken || undefined,
  });
}

export function getDb(): Db {
  if (db) return db;
  db = drizzle(createTursoClient(), { schema });
  return db;
}

const TEST_SCHEMA_STATEMENTS = [
  `CREATE TABLE users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE INDEX idx_sessions_user_id ON sessions(user_id)`,
  `CREATE INDEX idx_sessions_expires_at ON sessions(expires_at)`,
];

/** For tests — in-memory LibSQL */
export async function createTestDb(): Promise<Db> {
  const client = createClient({ url: ":memory:" });

  for (const statement of TEST_SCHEMA_STATEMENTS) {
    await client.execute(statement);
  }

  return drizzle(client, { schema });
}
