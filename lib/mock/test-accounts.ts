import type { Tier } from "@/lib/entitlements";
import type { User, UserRole } from "@/lib/db/types";

/** Shared password for both mock test accounts. */
export const MOCK_TEST_PASSWORD = "password123";

/**
 * Precomputed bcrypt hash for `password123` (cost 12).
 * Regenerate with: node -e "require('bcryptjs').hash('password123',12).then(console.log)"
 */
const PASSWORD_HASH =
  "$2b$12$43AXcQr0E10Yx8caQPG1R.fSTE.6XwH3NFoQ/PrvieVsGYfsM0kEa";

export type MockTestAccount = {
  id: number;
  email: string;
  password: string;
  password_hash: string;
  subscription_tier: Tier;
  role: UserRole;
  label: string;
};

/**
 * Fixed mock logins used when USE_MOCK_MAP_DATA=1.
 * - full@aga.test → advanced (worker + employer / full subscription)
 * - worker@aga.test → basic (worker subscription only)
 */
export const MOCK_TEST_ACCOUNTS: MockTestAccount[] = [
  {
    id: 1,
    email: "full@aga.test",
    password: MOCK_TEST_PASSWORD,
    password_hash: PASSWORD_HASH,
    subscription_tier: "advanced",
    role: "user",
    label: "Full subscription (Advanced)",
  },
  {
    id: 2,
    email: "worker@aga.test",
    password: MOCK_TEST_PASSWORD,
    password_hash: PASSWORD_HASH,
    subscription_tier: "basic",
    role: "user",
    label: "Worker subscription (Basic)",
  },
];

function toUser(account: MockTestAccount): User {
  const now = new Date();
  return {
    id: account.id,
    email: account.email,
    password_hash: account.password_hash,
    phone: null,
    preferred_locale: "en",
    subscription_tier: account.subscription_tier,
    role: account.role,
    stripe_customer_id: null,
    email_verified_at: now,
    created_at: now,
    updated_at: now,
  };
}

export function getMockUserByEmail(email: string): User | null {
  const account = MOCK_TEST_ACCOUNTS.find(
    (a) => a.email === email.trim().toLowerCase()
  );
  return account ? toUser(account) : null;
}

export function getMockUserById(id: number): User | null {
  const account = MOCK_TEST_ACCOUNTS.find((a) => a.id === id);
  return account ? toUser(account) : null;
}
