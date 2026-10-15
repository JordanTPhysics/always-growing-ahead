import mysql from "mysql2/promise";
import { isRemoteDatabaseConfigured } from "@/lib/db/config";
import {
  requestedDatabaseName,
  resolveDatabaseName,
} from "@/lib/db/database-name";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const globalForDb = globalThis as unknown as {
  mysqlPool?: Promise<mysql.Pool>;
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
  let database = requested;
  try {
    const probe = await mysql.createConnection(connectionOptions());
    try {
      const resolved = await resolveDatabaseName(probe, requested);
      if (resolved.exists) database = resolved.name;
    } finally {
      await probe.end();
    }
  } catch (err) {
    console.warn(
      `Could not look up MySQL schema case for ${requested}. Using that name as configured.`
    );
    console.warn(err);
  }

  if (database === requested) return openPool(database);

  console.warn(
    `DB_NAME=${requested} is not the MySQL schema name. Connecting to ${database}.`
  );
  try {
    return await openPool(database);
  } catch (err) {
    console.warn(
      `Could not open schema ${database}. Falling back to DB_NAME=${requested}.`
    );
    console.warn(err);
    return openPool(requested);
  }
}

function getPool(): Promise<mysql.Pool> {
  if (!globalForDb.mysqlPool) {
    globalForDb.mysqlPool = createPool().catch((err) => {
      globalForDb.mysqlPool = undefined;
      throw err;
    });
  }
  return globalForDb.mysqlPool;
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
