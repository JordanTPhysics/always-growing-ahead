/** Env value, or `aga`. Privileges in MySQL use this spelling exactly. */
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
 * Names to try, in order. Grants are case-sensitive on Linux (`AGA`.* is not
 * `aga`.*), and this project was initialized as `AGA` / `AGA_test`.
 */
export function databaseNameCandidates(requested: string): string[] {
  const names = [requested];
  const lower = requested.toLowerCase();
  if (!names.includes(lower)) names.push(lower);
  const legacy =
    lower === "aga" ? "AGA" : lower === "aga_test" ? "AGA_test" : null;
  if (legacy && !names.includes(legacy)) names.push(legacy);
  return names;
}

export function mysqlErrorCode(err: unknown): string | undefined {
  return (err as { code?: string }).code;
}

export function isDatabaseNameError(err: unknown): boolean {
  const code = mysqlErrorCode(err);
  return code === "ER_DBACCESS_DENIED_ERROR" || code === "ER_BAD_DB_ERROR";
}
