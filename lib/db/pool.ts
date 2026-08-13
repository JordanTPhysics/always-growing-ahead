import mysql from "mysql2/promise";
import { isRemoteDatabaseConfigured } from "@/lib/db/config";
import { isMockMapDataEnabled } from "@/lib/mock/nottingham";

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

function createPool(): mysql.Pool {
  if (!isRemoteDatabaseConfigured() || isMockMapDataEnabled()) {
    throw new Error(
      "MySQL is not available. Set a remote DB_HOST, or leave mock data enabled."
    );
  }

  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "AGA",
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: false,
    timezone: "Z",
  });
}

function getPool(): mysql.Pool {
  if (!globalForDb.mysqlPool) {
    globalForDb.mysqlPool = createPool();
  }
  return globalForDb.mysqlPool;
}

/** Lazy so mock / Netlify deploys never open a connection to 127.0.0.1. */
export const pool: mysql.Pool = new Proxy({} as mysql.Pool, {
  get(_target, property) {
    const real = getPool();
    const value = Reflect.get(real, property) as unknown;
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(real)
      : value;
  },
});

/** Soft check used by health/migrate scripts without throwing at import time. */
export function assertDbEnv() {
  required("DB_NAME");
}
