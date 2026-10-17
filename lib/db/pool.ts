import mysql from "mysql2/promise";
import { isRemoteDatabaseConfigured } from "@/lib/db/config";
import {
  databaseNameCandidates,
  isDatabaseNameError,
  requestedDatabaseName,
} from "@/lib/db/database-name";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const globalForDb = globalThis as unknown as {
  /** A Pool from an older hot reload, or the in-flight connect promise. */
  mysqlPool?: mysql.Pool | Promise<mysql.Pool>;
};

function connectionOptions(database?: string): mysql.PoolOptions {
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    ...(database ? { database } : {}),
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: false,
    timezone: "Z",
  };
}

async function openPool(database: string): Promise<mysql.Pool> {
  const created = mysql.createPool(connectionOptions(database));
  try {
    const conn = await created.getConnection();
    conn.release();
    return created;
  } catch (err) {
    await created.end();
    throw err;
  }
}

async function createPool(): Promise<mysql.Pool> {
  if (!isRemoteDatabaseConfigured()) {
    throw new Error(
      "MySQL is not available. Set a remote DB_HOST, or leave mock data enabled."
    );
  }

  const requested = requestedDatabaseName();
  const names = databaseNameCandidates(requested);
  let lastError: unknown;
  for (const name of names) {
    try {
      const opened = await openPool(name);
      if (name !== requested) {
        console.warn(
          `DB_NAME=${requested} could not be opened. Connected to ${name}.`
        );
      }
      return opened;
    } catch (err) {
      if (!isDatabaseNameError(err)) throw err;
      lastError = err;
    }
  }
  throw lastError;
}

function asPoolPromise(
  value: mysql.Pool | Promise<mysql.Pool>
): Promise<mysql.Pool> {
  if (typeof (value as Promise<mysql.Pool>).then === "function") {
    return value as Promise<mysql.Pool>;
  }
  return Promise.resolve(value as mysql.Pool);
}

function getPool(): Promise<mysql.Pool> {
  const existing = globalForDb.mysqlPool;
  if (existing) return asPoolPromise(existing);

  const created = createPool().catch((err: unknown) => {
    if (globalForDb.mysqlPool === created) globalForDb.mysqlPool = undefined;
    throw err;
  });
  globalForDb.mysqlPool = created;
  return created;
}

/** Lazy so mock / Netlify deploys never open a connection to 127.0.0.1. */
export const pool: mysql.Pool = new Proxy({} as mysql.Pool, {
  get(_target, property) {
    if (property === "then") return undefined;
    return (...args: unknown[]) =>
      getPool().then((real) => {
        const value = Reflect.get(real, property, real) as unknown;
        return typeof value === "function"
          ? (value as (...args: unknown[]) => unknown).apply(real, args)
          : value;
      });
  },
});

/** Soft check used by health/migrate scripts without throwing at import time. */
export function assertDbEnv() {
  required("DB_NAME");
}
