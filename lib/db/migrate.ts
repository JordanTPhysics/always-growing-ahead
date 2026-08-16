import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mysql, { type RowDataPacket } from "mysql2/promise";

dotenv.config({ path: ".env.local" });
dotenv.config();

type MigrationRow = RowDataPacket & { name: string };

async function main() {
  const host = process.env.DB_HOST ?? "127.0.0.1";
  const port = Number(process.env.DB_PORT ?? 3306);
  const user = process.env.DB_USER ?? "root";
  const password = process.env.DB_PASSWORD ?? "";
  const database = process.env.DB_NAME ?? "AGA";

  const root = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });
  try {
    await root.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (
      code !== "ER_DBACCESS_DENIED_ERROR" &&
      code !== "ER_SPECIFIC_ACCESS_DENIED_ERROR"
    ) {
      throw err;
    }
    console.log(
      `skip  CREATE DATABASE (no privilege); expecting ${database} to exist`
    );
  }
  await root.end();

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true,
  });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const dir = path.join(process.cwd(), "lib", "db", "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const [rows] = await conn.query<MigrationRow[]>(
      "SELECT name FROM schema_migrations WHERE name = ?",
      [file]
    );
    if (rows.length > 0) {
      console.log(`skip  ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    console.log(`apply ${file}`);
    await conn.query(sql);
    await conn.query("INSERT INTO schema_migrations (name) VALUES (?)", [file]);
  }

  await conn.end();
  console.log("Migrations complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
