import type Stripe from "stripe";
import {
  getUserById,
  setStripeCustomerId,
  updateUserTier,
} from "@/lib/db/repositories/users";
import { getLatestSubscriptionForUser } from "@/lib/db/repositories/subscriptions";
import {
  getTrialForUser,
  insertTrial,
  listCancelledTrialsPastEnd,
  listTrialsDueToCharge,
  markTrialChargeFailed,
  markTrialConverted,
  markTrialExpired,
  type SubscriptionTrial,
} from "@/lib/db/repositories/trials";
import type { PaidTier } from "@/lib/stripe/prices";
import { priceIdForTier } from "@/lib/stripe/prices";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { syncStripeSubscription } from "@/lib/stripe/sync";
import type { TrialView } from "@/lib/stripe/trial-view";

export const TRIAL_DAYS = 7;
export type { TrialView };

export function trialEndsAt(from = new Date()): Date {
  return new Date(from.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

export function trialBlocksNewCheckout(trial: SubscriptionTrial): boolean {
  if (trial.status === "active") return true;
  return (
    trial.status === "cancelled" &&
    new Date(trial.trial_ends_at).getTime() > Date.now()
  );
}

export function toTrialView(trial: SubscriptionTrial | null): TrialView | null {
  if (!trial) return null;
  if (trial.status !== "active" && trial.status !== "cancelled") return null;
  return {
    status: trial.status,
    tier: trial.tier,
    period: trial.billing_period,
    endsAt: new Date(trial.trial_ends_at).toISOString(),
  };
}

function isDuplicate(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "ER_DUP_ENTRY"
  );
}

function customerIdOf(
  customer: Stripe.Checkout.Session["customer"]
): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

function paymentMethodIdOf(
  paymentMethod: string | Stripe.PaymentMethod | null
): string | null {
  if (!paymentMethod) return null;
  return typeof paymentMethod === "string" ? paymentMethod : paymentMethod.id;
}

async function ensureTrialTier(userId: number, tier: PaidTier): Promise<void> {
  const user = await getUserById(userId);
  if (user && user.subscription_tier === "none") {
    await updateUserTier(userId, tier);
  }
}

export async function applyTrialSetup(
  session: Stripe.Checkout.Session
): Promise<void> {
  if (session.metadata?.purpose !== "trial") return;

  const userId = Number(session.metadata.userId);
  const tier = session.metadata.tier;
  const period = session.metadata.period;
  if (!Number.isFinite(userId)) return;
  if (tier !== "basic" && tier !== "advanced") return;
  if (period !== "monthly" && period !== "yearly") return;

  const existing = await getTrialForUser(userId);
  if (existing) {
    if (existing.status === "active" || existing.status === "cancelled") {
      await ensureTrialTier(userId, existing.tier);
    }
    return;
  }

  const setupIntentId =
    typeof session.setup_intent === "string"
      ? session.setup_intent
      : session.setup_intent?.id;
  const customerId = customerIdOf(session.customer);
  if (!setupIntentId || !customerId) return;

  const stripe = getStripe();
  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
  const paymentMethodId = paymentMethodIdOf(setupIntent.payment_method);
  if (!paymentMethodId) return;

  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (paymentMethod.type !== "bacs_debit") {
    console.warn("[trial] Expected UK bank debit, got", paymentMethod.type);
    return;
  }

  const user = await getUserById(userId);
  if (!user) return;
  if (!user.stripe_customer_id) {
    await setStripeCustomerId(userId, customerId);
  }

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  try {
    await insertTrial({
      userId,
      tier,
      billingPeriod: period,
      stripeCustomerId: customerId,
      stripePaymentMethodId: paymentMethodId,
      trialEndsAt: trialEndsAt(),
    });
  } catch (err) {
    if (!isDuplicate(err)) throw err;
  }

  await updateUserTier(userId, tier);
}

async function revokeTrialAccess(trial: SubscriptionTrial): Promise<void> {
  const subscription = await getLatestSubscriptionForUser(trial.user_id);
  if (
    subscription &&
    (subscription.status === "active" || subscription.status === "past_due")
  ) {
    return;
  }
  const user = await getUserById(trial.user_id);
  if (user && user.subscription_tier === trial.tier) {
    await updateUserTier(trial.user_id, "none");
  }
}

async function subscriptionForTrial(
  stripe: Stripe,
  trial: SubscriptionTrial
): Promise<Stripe.Subscription> {
  if (trial.stripe_subscription_id) {
    return stripe.subscriptions.retrieve(trial.stripe_subscription_id);
  }

  const listed = await stripe.subscriptions.list({
    customer: trial.stripe_customer_id,
    status: "all",
    limit: 20,
  });
  const found = listed.data.find(
    (sub) =>
      sub.metadata?.trialId === String(trial.id) &&
      sub.status !== "canceled" &&
      sub.status !== "incomplete_expired"
  );
  if (found) return found;

  return stripe.subscriptions.create(
    {
      customer: trial.stripe_customer_id,
      items: [{ price: priceIdForTier(trial.tier, trial.billing_period) }],
      default_payment_method: trial.stripe_payment_method_id,
      off_session: true,
      payment_behavior: "allow_incomplete",
      payment_settings: {
        payment_method_types: ["bacs_debit"],
        save_default_payment_method: "on_subscription",
      },
      metadata: {
        userId: String(trial.user_id),
        tier: trial.tier,
        period: trial.billing_period,
        trialId: String(trial.id),
      },
    },
    { idempotencyKey: `trial-charge-${trial.id}` }
  );
}

function chargeAccepted(subscription: Stripe.Subscription): boolean {
  return (
    subscription.status === "active" ||
    subscription.status === "trialing" ||
    subscription.status === "past_due" ||
    subscription.status === "incomplete" ||
    subscription.status === "unpaid"
  );
}

export async function settleTrials(): Promise<{
  charged: number;
  chargeFailed: number;
  expired: number;
}> {
  let charged = 0;
  let chargeFailed = 0;

  if (isStripeConfigured()) {
    const stripe = getStripe();
    const due = await listTrialsDueToCharge();
    for (const trial of due) {
      let converted = false;
      try {
        const subscription = await subscriptionForTrial(stripe, trial);
        if (!chargeAccepted(subscription)) {
          if (
            subscription.status !== "canceled" &&
            subscription.status !== "incomplete_expired"
          ) {
            await stripe.subscriptions.cancel(subscription.id);
          }
          throw new Error(
            `Subscription ${subscription.id} was not charged (${subscription.status})`
          );
        }
        await markTrialConverted(trial.id, subscription.id);
        converted = true;
        await syncStripeSubscription(subscription);
        charged += 1;
      } catch (err) {
        if (converted) {
          console.error("[trial] charged but sync failed", trial.id, err);
          charged += 1;
          continue;
        }
        console.error("[trial] charge failed", trial.id, err);
        await markTrialChargeFailed(trial.id);
        await revokeTrialAccess(trial);
        chargeFailed += 1;
      }
    }
  }

  const ended = await listCancelledTrialsPastEnd();
  for (const trial of ended) {
    await revokeTrialAccess(trial);
    await markTrialExpired(trial.id);
  }

  return { charged, chargeFailed, expired: ended.length };
}
