/** True when a MySQL host exists that this runtime can actually reach. */
export function isRemoteDatabaseConfigured(): boolean {
  const host = (process.env.DB_HOST ?? "").trim();
  if (!host) return false;

  const isLoopback =
    host === "127.0.0.1" || host === "localhost" || host === "::1";
  const hosted =
    Boolean(process.env.NETLIFY) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isLoopback && hosted) return false;
  return true;
}
