import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Lazy-initialized DB client.
 *
 * We do NOT connect at module load time. Next.js can import this file
 * during the build step (e.g. static analysis of route files) before
 * DATABASE_URL is available in the environment, which would otherwise
 * crash the build. Instead we create the connection the first time a
 * query actually runs, and cache it on `globalThis` so hot-reload in
 * dev doesn't open a new connection pool on every file save.
 */
declare global {
  // eslint-disable-next-line no-var
  var __shoppilotDb: PostgresJsDatabase<typeof schema> | undefined;
  // eslint-disable-next-line no-var
  var __shoppilotSql: ReturnType<typeof postgres> | undefined;
}

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (see .env.example). " +
      "The app's demo/mock features (AI chat, mock payments) work without external " +
      "API keys, but real product/order data requires a Postgres connection."
    );
  }
  const sql = postgres(connectionString, { prepare: false });
  const db = drizzle(sql, { schema });
  return { db, sql };
}

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!globalThis.__shoppilotDb) {
    const { db, sql } = createDb();
    globalThis.__shoppilotDb = db;
    globalThis.__shoppilotSql = sql;
  }
  return globalThis.__shoppilotDb;
}

/** True if DATABASE_URL is configured — lets API routes fail gracefully instead of throwing. */
export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export * as schema from "./schema";
