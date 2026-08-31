import { isRemoteDatabaseConfigured } from "@/lib/db/config";
import { pool } from "@/lib/db/pool";
import type { Tier } from "@/lib/entitlements";
import type { User, UserRole } from "@/lib/db/types";
import { isMockMapDataEnabled } from "@/lib/mock/nottingham";
import { getMockUserByEmail, getMockUserById } from "@/lib/mock/test-accounts";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

type UserRow = User & RowDataPacket;

export async function getUserByEmail(email: string): Promise<User | null> {
  if (isMockMapDataEnabled()) {
    return getMockUserByEmail(email);
  }
  const [rows] = await pool.execute<UserRow[]>(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [email.toLowerCase()]
  );
  return rows[0] ?? null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  if (isMockMapDataEnabled()) return null;
  const [rows] = await pool.execute<UserRow[]>(
    "SELECT * FROM users WHERE username = ? LIMIT 1",
    [username.toLowerCase()]
  );
  return rows[0] ?? null;
}

export async function getUserById(id: number): Promise<User | null> {
  if (isMockMapDataEnabled()) {
    return getMockUserById(id);
  }
  const [rows] = await pool.execute<UserRow[]>(
    "SELECT * FROM users WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] ?? null;
}

/** Map a session user to a real MySQL id (mock JWT ids may not match rows). */
export async function resolveDbUserId(
  userId: number,
  email?: string | null
): Promise<number | null> {
  if (isRemoteDatabaseConfigured()) {
    if (Number.isInteger(userId) && userId > 0) {
      const [rows] = await pool.execute<UserRow[]>(
        "SELECT * FROM users WHERE id = ? LIMIT 1",
        [userId]
      );
      if (rows[0]) return rows[0].id;
    }
    if (email) {
      const [rows] = await pool.execute<UserRow[]>(
        "SELECT * FROM users WHERE email = ? LIMIT 1",
        [email.toLowerCase()]
      );
      if (rows[0]) return rows[0].id;
    }
    return null;
  }

  if (Number.isInteger(userId) && userId > 0) {
    const user = await getUserById(userId);
    if (user) return user.id;
  }
  if (email) {
    const user = await getUserByEmail(email);
    if (user) return user.id;
  }
  return null;
}

export async function createUser(input: {
  email: string;
  passwordHash?: string | null;
  username?: string | null;
  phone?: string | null;
  city?: string | null;
  district?: string | null;
  preferredLocale?: string;
  emailVerifiedAt?: Date | null;
}): Promise<User> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO users
      (email, username, password_hash, phone, city, district, preferred_locale, email_verified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.email.toLowerCase(),
      input.username?.trim().toLowerCase() ?? null,
      input.passwordHash ?? null,
      input.phone ?? null,
      input.city ?? null,
      input.district ?? null,
      input.preferredLocale ?? "en",
      input.emailVerifiedAt ?? null,
    ]
  );
  const user = await getUserById(result.insertId);
  if (!user) throw new Error("Failed to load created user");
  return user;
}

export async function updateUserTier(userId: number, tier: Tier): Promise<void> {
  await pool.execute("UPDATE users SET subscription_tier = ? WHERE id = ?", [
    tier,
    userId,
  ]);
}

export async function setUserRole(
  userId: number,
  role: UserRole
): Promise<void> {
  await pool.execute("UPDATE users SET role = ? WHERE id = ?", [role, userId]);
}

export async function isAdmin(userId: number): Promise<boolean> {
  if (isMockMapDataEnabled()) {
    return getMockUserById(userId)?.role === "admin";
  }

  const [rows] = await pool.execute<
    (RowDataPacket & { role: UserRole })[]
  >("SELECT role FROM users WHERE id = ? LIMIT 1", [userId]);
  return rows[0]?.role === "admin";
}

export async function listRecentUsers(): Promise<
  Pick<User, "id" | "email" | "subscription_tier" | "role">[]
> {
  const [rows] = await pool.execute<
    (Pick<User, "id" | "email" | "subscription_tier" | "role"> & RowDataPacket)[]
  >(
    `SELECT id, email, subscription_tier, role
     FROM users
     ORDER BY created_at DESC
     LIMIT 100`
  );
  return rows;
}

export async function setStripeCustomerId(
  userId: number,
  stripeCustomerId: string
): Promise<void> {
  await pool.execute("UPDATE users SET stripe_customer_id = ? WHERE id = ?", [
    stripeCustomerId,
    userId,
  ]);
}

export async function getUserByStripeCustomerId(
  stripeCustomerId: string
): Promise<User | null> {
  const [rows] = await pool.execute<UserRow[]>(
    "SELECT * FROM users WHERE stripe_customer_id = ? LIMIT 1",
    [stripeCustomerId]
  );
  return rows[0] ?? null;
}

export async function updateUserPhone(
  userId: number,
  phone: string | null
): Promise<void> {
  await pool.execute("UPDATE users SET phone = ? WHERE id = ?", [phone, userId]);
}

export async function setEmailVerified(userId: number): Promise<void> {
  await pool.execute(
    "UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE id = ?",
    [userId]
  );
}

export async function updatePreferredLocale(
  userId: number,
  locale: string
): Promise<void> {
  await pool.execute("UPDATE users SET preferred_locale = ? WHERE id = ?", [
    locale,
    userId,
  ]);
}
