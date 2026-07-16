import mysql from "mysql2/promise";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const globalForDb = globalThis as unknown as {
  mysqlPool?: mysql.Pool;
};

export const pool =
  globalForDb.mysqlPool ??
  mysql.createPool({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "AGA",
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: false,
    timezone: "Z",
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.mysqlPool = pool;
}

/** Soft check used by health/migrate scripts without throwing at import time. */
export function assertDbEnv() {
  required("DB_NAME");
}
