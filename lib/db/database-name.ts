import type { RowDataPacket } from "mysql2";

type Queryable = {
  query: (sql: string, values?: unknown[]) => Promise<unknown>;
};

type SchemaRow = RowDataPacket & {
  name: string;
  has_users: number;
};

export type SchemaMatch = {
  name: string;
  hasUsers: boolean;
};

/** Env value, or `aga`. Linux MySQL stores this name with exact letter case. */
export function requestedDatabaseName(): string {
  const name = (process.env.DB_NAME ?? "aga").trim() || "aga";
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error(
      "DB_NAME must contain only letters, numbers, and underscores"
    );
  }
  return name;
}

/**
 * Pick the schema MySQL actually stored.
 * `AGA` and `aga` are different databases when lower_case_table_names=0.
 */
export function chooseSchema(requested: string, matches: SchemaMatch[]): string {
  if (matches.length === 0) return requested.toLowerCase();
  if (matches.length === 1) return matches[0].name;

  const exactWithUsers = matches.find(
    (schema) => schema.name === requested && schema.hasUsers
  );
  if (exactWithUsers) return exactWithUsers.name;

  const withUsers = matches.filter((schema) => schema.hasUsers);
  if (withUsers.length === 1) return withUsers[0].name;

  return (
    matches.find((schema) => schema.name === requested)?.name ??
    matches.find((schema) => schema.name === requested.toLowerCase())?.name ??
    matches[0].name
  );
}

export async function resolveDatabaseName(
  connection: Queryable,
  requested = requestedDatabaseName()
): Promise<{ name: string; exists: boolean }> {
  const result = await connection.query(
    `SELECT s.SCHEMA_NAME AS name,
            IF(u.TABLE_NAME IS NULL, 0, 1) AS has_users
     FROM information_schema.SCHEMATA s
     LEFT JOIN information_schema.TABLES u
       ON u.TABLE_SCHEMA = s.SCHEMA_NAME
      AND u.TABLE_NAME = 'users'
     WHERE LOWER(s.SCHEMA_NAME) = LOWER(?)`,
    [requested]
  );
  const rows = (Array.isArray(result) ? result[0] : []) as SchemaRow[];

  if (rows.length === 0) {
    return { name: requested.toLowerCase(), exists: false };
  }

  const name = chooseSchema(
    requested,
    rows.map((row) => ({
      name: String(row.name),
      hasUsers: Number(row.has_users) === 1,
    }))
  );
  return { name, exists: true };
}
