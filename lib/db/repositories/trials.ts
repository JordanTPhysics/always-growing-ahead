import { pool } from "@/lib/db/pool";
import type { PaidTier } from "@/lib/stripe/prices";
import type { BillingPeriod } from "@/lib/stripe/billing-period";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export type TrialStatus =
  | "active"
  | "cancelled"
  | "expired"
  | "converted"
  | "charge_failed";

export type SubscriptionTrial = {
  id: number;
  user_id: number;
  tier: PaidTier;
  billing_period: BillingPeriod;
  stripe_customer_id: string;
  stripe_payment_method_id: string;
  status: TrialStatus;
  trial_ends_at: Date;
  cancelled_at: Date | null;
  converted_at: Date | null;
  stripe_subscription_id: string | null;
  created_at: Date;
};

type TrialRow = SubscriptionTrial & RowDataPacket;

export async function getTrialForUser(
  userId: number
): Promise<SubscriptionTrial | null> {
  const [rows] = await pool.execute<TrialRow[]>(
    "SELECT * FROM subscription_trials WHERE user_id = ? LIMIT 1",
    [userId]
  );
  return rows[0] ?? null;
}

export async function insertTrial(input: {
  userId: number;
  tier: PaidTier;
  billingPeriod: BillingPeriod;
  stripeCustomerId: string;
  stripePaymentMethodId: string;
  trialEndsAt: Date;
}): Promise<void> {
  await pool.execute(
    `INSERT INTO subscription_trials
      (user_id, tier, billing_period, stripe_customer_id, stripe_payment_method_id, status, trial_ends_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?)`,
    [
      input.userId,
      input.tier,
      input.billingPeriod,
      input.stripeCustomerId,
      input.stripePaymentMethodId,
      input.trialEndsAt,
    ]
  );
}

export async function cancelTrial(trialId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE subscription_trials
     SET status = 'cancelled', cancelled_at = UTC_TIMESTAMP()
     WHERE id = ? AND status = 'active' AND trial_ends_at > UTC_TIMESTAMP()`,
    [trialId]
  );
  return result.affectedRows > 0;
}

export async function listTrialsDueToCharge(): Promise<SubscriptionTrial[]> {
  const [rows] = await pool.execute<TrialRow[]>(
    `SELECT * FROM subscription_trials
     WHERE status = 'active' AND trial_ends_at <= UTC_TIMESTAMP()`
  );
  return rows;
}

export async function listCancelledTrialsPastEnd(): Promise<SubscriptionTrial[]> {
  const [rows] = await pool.execute<TrialRow[]>(
    `SELECT * FROM subscription_trials
     WHERE status = 'cancelled' AND trial_ends_at <= UTC_TIMESTAMP()`
  );
  return rows;
}

export async function markTrialConverted(
  trialId: number,
  stripeSubscriptionId: string
): Promise<void> {
  await pool.execute(
    `UPDATE subscription_trials
     SET status = 'converted',
         converted_at = UTC_TIMESTAMP(),
         stripe_subscription_id = ?
     WHERE id = ? AND status = 'active'`,
    [stripeSubscriptionId, trialId]
  );
}

export async function markTrialChargeFailed(trialId: number): Promise<void> {
  await pool.execute(
    `UPDATE subscription_trials
     SET status = 'charge_failed'
     WHERE id = ? AND status = 'active'`,
    [trialId]
  );
}

export async function markTrialExpired(trialId: number): Promise<void> {
  await pool.execute(
    `UPDATE subscription_trials
     SET status = 'expired'
     WHERE id = ? AND status = 'cancelled'`,
    [trialId]
  );
}
