import type Stripe from "stripe";
import type { Tier } from "@/lib/entitlements";
import {
  getUserById,
  getUserByStripeCustomerId,
  setStripeCustomerId,
  updateUserTier,
} from "@/lib/db/repositories/users";
import {
  upsertSubscription,
  type SubscriptionStatus,
} from "@/lib/db/repositories/subscriptions";
import { tierFromPriceId, type PaidTier } from "@/lib/stripe/prices";

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  return "canceled";
}

function periodEnd(subscription: Stripe.Subscription): Date | null {
  const end =
    subscription.items.data[0]?.current_period_end ??
    // Fallback for older payload shapes
    (subscription as Stripe.Subscription & { current_period_end?: number })
      .current_period_end;
  return end ? new Date(end * 1000) : null;
}

function paidTierFromSubscription(
  subscription: Stripe.Subscription
): PaidTier | null {
  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) return null;
  return tierFromPriceId(priceId);
}

function customerIdOf(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

export async function syncStripeSubscription(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = customerIdOf(subscription.customer);
  if (!customerId) return;

  const user = await getUserByStripeCustomerId(customerId);
  if (!user) {
    console.warn("[stripe] No user for customer", customerId);
    return;
  }

  const tier = paidTierFromSubscription(subscription);
  if (!tier) {
    console.warn("[stripe] Unknown price on subscription", subscription.id);
    return;
  }

  const status = mapStripeStatus(subscription.status);
  await upsertSubscription({
    userId: user.id,
    tier,
    stripeSubscriptionId: subscription.id,
    status,
    currentPeriodEnd: periodEnd(subscription),
  });

  // Keep access while past_due (grace); revoke only when canceled.
  const effective: Tier = status === "canceled" ? "none" : tier;
  if (user.subscription_tier !== effective) {
    await updateUserTier(user.id, effective);
  }
}

export async function applyCheckoutCompleted(
  session: Stripe.Checkout.Session,
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = session.metadata?.userId
    ? Number(session.metadata.userId)
    : null;
  const customerId = customerIdOf(session.customer);

  if (userId && Number.isFinite(userId) && customerId) {
    const user = await getUserById(userId);
    if (user && !user.stripe_customer_id) {
      await setStripeCustomerId(userId, customerId);
    }
  }

  await syncStripeSubscription(subscription);
}
