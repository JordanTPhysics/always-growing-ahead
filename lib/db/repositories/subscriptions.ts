import { pool } from "@/lib/db/pool";
import type { PaidTier } from "@/lib/stripe/prices";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export type SubscriptionStatus = "active" | "past_due" | "canceled";

export type Subscription = {
  id: number;
  user_id: number;
  tier: PaidTier;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  current_period_end: Date | null;
  created_at: Date;
};

type SubscriptionRow = Subscription & RowDataPacket;

export async function getSubscriptionByStripeId(
  stripeSubscriptionId: string
): Promise<Subscription | null> {
  const [rows] = await pool.execute<SubscriptionRow[]>(
    "SELECT * FROM subscriptions WHERE stripe_subscription_id = ? LIMIT 1",
    [stripeSubscriptionId]
  );
  return rows[0] ?? null;
}

export async function getLatestSubscriptionForUser(
  userId: number
): Promise<Subscription | null> {
  const [rows] = await pool.execute<SubscriptionRow[]>(
    `SELECT * FROM subscriptions
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function upsertSubscription(input: {
  userId: number;
  tier: PaidTier;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
}): Promise<Subscription> {
  const existing = await getSubscriptionByStripeId(input.stripeSubscriptionId);
  if (existing) {
    await pool.execute(
      `UPDATE subscriptions
       SET tier = ?, status = ?, current_period_end = ?
       WHERE id = ?`,
      [input.tier, input.status, input.currentPeriodEnd, existing.id]
    );
    const updated = await getSubscriptionByStripeId(input.stripeSubscriptionId);
    if (!updated) throw new Error("Failed to load updated subscription");
    return updated;
  }

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO subscriptions
      (user_id, tier, stripe_subscription_id, status, current_period_end)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.userId,
      input.tier,
      input.stripeSubscriptionId,
      input.status,
      input.currentPeriodEnd,
    ]
  );

  const [rows] = await pool.execute<SubscriptionRow[]>(
    "SELECT * FROM subscriptions WHERE id = ? LIMIT 1",
    [result.insertId]
  );
  if (!rows[0]) throw new Error("Failed to load created subscription");
  return rows[0];
}
