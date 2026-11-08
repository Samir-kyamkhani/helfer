import "server-only";
import { BillingInterval, BillingOwnerType, PaymentStatus, SubscriptionStatus } from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider, getPaymentProviderByName } from "@/lib/payments/factory";
import {
  ProviderSubscriptionNotUpdatableError,
  type BillingOwnerKind,
  type PaymentProvider,
  type PaymentProviderName,
  type ProviderInvoice,
  type ProviderPayment,
  type ProviderSubscription,
  type ProviderWebhookEvent,
} from "@/lib/payments/types";

const checkoutSchema = z.object({
  ownerType: z.enum(["USER", "ORGANIZATION"]),
  ownerId: z.string().min(1).max(128),
  planId: z.string().min(1).max(128),
  interval: z.enum(["MONTHLY", "YEARLY"]),
  couponCode: z.string().trim().max(64).optional(),
});

const ownerInputSchema = z.object({
  ownerType: z.enum(["USER", "ORGANIZATION"]),
  ownerId: z.string().min(1).max(128),
});

const statusMap: Record<ProviderSubscription["status"], SubscriptionStatus> = {
  incomplete: SubscriptionStatus.INCOMPLETE,
  trialing: SubscriptionStatus.TRIALING,
  active: SubscriptionStatus.ACTIVE,
  past_due: SubscriptionStatus.PAST_DUE,
  unpaid: SubscriptionStatus.UNPAID,
  canceled: SubscriptionStatus.CANCELED,
  incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
  paused: SubscriptionStatus.PAUSED,
};

const paymentStatusRank: Record<PaymentStatus, number> = {
  PENDING: 0,
  FAILED: 1,
  SUCCEEDED: 2,
  PARTIALLY_REFUNDED: 3,
  REFUNDED: 4,
};

const liveSubscriptionStatuses = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.PAST_DUE,
] as const;

const liveSubscriptionStatusSet = new Set<SubscriptionStatus>(liveSubscriptionStatuses);

const liveProviderStatusSet = new Set<ProviderSubscription["status"]>([
  "active",
  "trialing",
  "past_due",
]);

function providerStatusForLocalStatus(status: SubscriptionStatus): ProviderSubscription["status"] {
  switch (status) {
    case SubscriptionStatus.TRIALING:
      return "trialing";
    case SubscriptionStatus.PAST_DUE:
      return "past_due";
    default:
      return "active";
  }
}

/**
 * Razorpay can respond to a cycle-end cancellation with a terminal status and
 * an `ended_at` in the past even though the customer paid through the end of
 * the current period. Keep the paid status locally until the period actually
 * ends so cancellation never revokes access the customer already paid for.
 */
function retainPaidPeriodForScheduledCancellation(
  value: ProviderSubscription,
  previousStatus: SubscriptionStatus,
): ProviderSubscription {
  if (value.status !== "canceled") return value;
  const periodEnd = value.currentPeriodEnd ?? value.nextBillingDate;
  if (!periodEnd || periodEnd.getTime() <= Date.now()) return value;
  return {
    ...value,
    status: providerStatusForLocalStatus(previousStatus),
    endedAt: null,
    canceledAt: null,
    cancelAtPeriodEnd: true,
  };
}

function currentSubscriptionFrom<T extends { status: SubscriptionStatus; updatedAt: Date }>(subscriptions: T[]) {
  return subscriptions.find((subscription) => liveSubscriptionStatusSet.has(subscription.status))
    ?? subscriptions.find((subscription) => subscription.status === SubscriptionStatus.PAUSED)
    ?? subscriptions.find((subscription) => subscription.status === SubscriptionStatus.INCOMPLETE)
    ?? subscriptions[0]
    ?? null;
}

/**
 * Capabilities are resolved from the adapter that is actually responsible for
 * the subscription. A missing provider configuration must not break the
 * billing overview, so failures degrade to "no provider-specific controls".
 */
function providerControlCapabilities(provider: "STRIPE" | "RAZORPAY") {
  try {
    const capabilities = getPaymentProviderByName(provider).capabilities;
    return {
      supportsResume: capabilities.supportsResume,
      supportsRenewalResume: capabilities.supportsRenewalResume,
      supportsPaymentMethodManagement: capabilities.supportsPaymentMethodManagement,
    };
  } catch (error) {
    console.error(`Unable to read ${provider} billing capabilities.`, error);
    return null;
  }
}

async function assertOwnerAccess(ownerType: BillingOwnerKind, ownerId: string, mode: "read" | "manage") {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error("Authentication required.");

  if (ownerType === "USER") {
    if (ownerId !== session.user.id) throw new Error("Billing access denied.");
    return session;
  }

  const member = await prisma.member.findUnique({
    where: { organizationId_userId: { organizationId: ownerId, userId: session.user.id } },
    select: { role: true },
  });
  if (!member || (mode === "manage" && !canManageBilling(member.role))) {
    throw new Error("Billing access denied.");
  }
  return session;
}

async function providerCustomerFor(ownerType: BillingOwnerType, ownerId: string, provider: PaymentProviderName, user: { id: string; email: string; name: string }) {
  const existing = await prisma.billingCustomer.findUnique({
    where: { ownerType_ownerId_provider: { ownerType, ownerId, provider } },
  });
  if (existing) return existing;

  const org = ownerType === BillingOwnerType.ORGANIZATION
    ? await prisma.organization.findUnique({ where: { id: ownerId }, select: { name: true } })
    : null;
  const customer = await getPaymentProviderByName(provider).createCustomer({
    email: user.email,
    name: org?.name ?? user.name,
    metadata: { ownerType, ownerId, userId: user.id },
  });
  return prisma.billingCustomer.upsert({
    where: { ownerType_ownerId_provider: { ownerType, ownerId, provider } },
    create: {
      ownerType,
      ownerId,
      provider,
      providerCustomerId: customer.id,
      email: user.email,
    },
    update: { email: user.email },
  });
}

function providerPlanDetails(plan: {
  stripeMonthlyPriceId: string | null;
  stripeYearlyPriceId: string | null;
  razorpayMonthlyPlanId: string | null;
  razorpayYearlyPlanId: string | null;
  razorpayMonthlyCycles: number | null;
  razorpayYearlyCycles: number | null;
}, provider: PaymentProviderName, interval: BillingInterval) {
  if (provider === "STRIPE") {
    const id = interval === BillingInterval.MONTHLY ? plan.stripeMonthlyPriceId : plan.stripeYearlyPriceId;
    if (!id) throw new Error(`The ${interval.toLowerCase()} Stripe price is not configured for this plan.`);
    return { id, totalBillingCycles: undefined };
  }
  const id = interval === BillingInterval.MONTHLY ? plan.razorpayMonthlyPlanId : plan.razorpayYearlyPlanId;
  const totalBillingCycles = interval === BillingInterval.MONTHLY ? plan.razorpayMonthlyCycles : plan.razorpayYearlyCycles;
  if (!id) throw new Error(`The ${interval.toLowerCase()} Razorpay plan is not configured for this plan.`);
  if (!totalBillingCycles || totalBillingCycles < 1) throw new Error("Configure the finite Razorpay billing cycle count for this plan.");
  return { id, totalBillingCycles };
}

export async function listSubscriptionPlans() {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      currency: true,
      monthlyPrice: true,
      yearlyPrice: true,
      monthlyPromptLimit: true,
      workspaceLimit: true,
      unlimitedWorkspaces: true,
      publicSharing: true,
      pdfExport: true,
      sortOrder: true,
      stripeMonthlyPriceId: true,
      stripeYearlyPriceId: true,
      razorpayMonthlyPlanId: true,
      razorpayYearlyPlanId: true,
      razorpayMonthlyCycles: true,
      razorpayYearlyCycles: true,
    },
  });
  return plans.map((plan) => {
    const { stripeMonthlyPriceId, stripeYearlyPriceId, razorpayMonthlyPlanId, razorpayYearlyPlanId, razorpayMonthlyCycles, razorpayYearlyCycles, ...publicPlan } = plan;
    const configuredProvider = process.env.PAYMENT_PROVIDER?.toUpperCase();
    const serverReady = configuredProvider === "STRIPE"
      ? Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET)
      : configuredProvider === "RAZORPAY"
        ? Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET)
        : false;
    const isConfigured = (interval: BillingInterval) => {
      if (!serverReady || (interval === BillingInterval.MONTHLY ? plan.monthlyPrice : plan.yearlyPrice) < 1) return false;
      if (configuredProvider === "STRIPE") return Boolean(interval === BillingInterval.MONTHLY ? stripeMonthlyPriceId : stripeYearlyPriceId);
      return Boolean(
        (interval === BillingInterval.MONTHLY ? razorpayMonthlyPlanId : razorpayYearlyPlanId) &&
        (interval === BillingInterval.MONTHLY ? razorpayMonthlyCycles : razorpayYearlyCycles),
      );
    };
    return { ...publicPlan, checkout: { monthly: isConfigured(BillingInterval.MONTHLY), yearly: isConfigured(BillingInterval.YEARLY) } };
  });
}

export async function startSubscriptionCheckout(input: unknown) {
  const parsed = checkoutSchema.parse(input);
  const session = await assertOwnerAccess(parsed.ownerType, parsed.ownerId, "manage");
  if (!session.user.emailVerified) throw new Error("Verify your email before starting a subscription.");
  await expireEndedSubscriptions(parsed.ownerType, parsed.ownerId);

  const provider = getPaymentProvider();
  const plan = await prisma.subscriptionPlan.findFirst({ where: { id: parsed.planId, active: true } });
  if (!plan) throw new Error("The selected plan is unavailable.");
  const price = parsed.interval === "MONTHLY" ? plan.monthlyPrice : plan.yearlyPrice;
  if (price < 1) throw new Error("The free plan does not require checkout.");

  const existing = await prisma.subscription.findFirst({
    where: {
      ownerType: parsed.ownerType,
      ownerId: parsed.ownerId,
      status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE] },
    },
  });
  if (existing) throw new Error("This account already has a subscription. Change its plan from billing settings.");

  const customer = await providerCustomerFor(parsed.ownerType, parsed.ownerId, provider.name, {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });
  const providerPlan = providerPlanDetails(plan, provider.name, parsed.interval);
  const baseUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const metadata = {
    ownerType: parsed.ownerType,
    ownerId: parsed.ownerId,
    planId: plan.id,
    interval: parsed.interval,
    initiatedByUserId: session.user.id,
  };
  const result = await provider.createCheckout({
    customerId: customer.providerCustomerId,
    customerEmail: session.user.email,
    customerName: session.user.name,
    planId: plan.id,
    planName: plan.name,
    providerPlanId: providerPlan.id,
    interval: parsed.interval,
    currency: plan.currency,
    amount: price,
    successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${baseUrl}/checkout/cancel`,
    couponCode: parsed.couponCode,
    totalBillingCycles: providerPlan.totalBillingCycles,
    metadata,
  });
  await prisma.checkoutAttempt.create({
    data: {
      ownerType: parsed.ownerType,
      ownerId: parsed.ownerId,
      initiatedByUserId: session.user.id,
      planId: plan.id,
      provider: provider.name,
      interval: parsed.interval,
      providerCustomerId: customer.providerCustomerId,
      providerCheckoutId: result.checkoutId,
      providerSubscriptionId: result.kind === "razorpay-subscription" ? result.subscriptionId : null,
      checkoutUrl: result.kind === "redirect" ? result.url : null,
      couponCode: parsed.couponCode ?? null,
    },
  });
  return result;
}

async function authorizedOwner(input: unknown, mode: "read" | "manage") {
  const owner = ownerInputSchema.parse(input);
  await assertOwnerAccess(owner.ownerType, owner.ownerId, mode);
  return owner;
}

export async function getBillingOverview(input: unknown) {
  const owner = await authorizedOwner(input, "read");
  await expireEndedSubscriptions(owner.ownerType, owner.ownerId);
  try { await refreshProviderHistory(owner); }
  catch { console.error("Unable to refresh billing provider history for this account."); }
  const [subscriptions, customer, paymentMethods] = await Promise.all([
    prisma.subscription.findMany({
      where: { ownerType: owner.ownerType, ownerId: owner.ownerId },
      include: { plan: true },
      orderBy: { updatedAt: "desc" },
      take: 25,
    }),
    prisma.billingCustomer.findFirst({ where: { ownerType: owner.ownerType, ownerId: owner.ownerId } }),
    prisma.paymentMethod.findMany({ where: { ownerType: owner.ownerType, ownerId: owner.ownerId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
  ]);
  const subscription = currentSubscriptionFrom(subscriptions);
  const provider = subscription?.provider ?? process.env.PAYMENT_PROVIDER?.toUpperCase() ?? null;
  return {
    owner,
    subscription,
    customer,
    paymentMethods,
    provider,
    capabilities: subscription && subscription.provider !== "MANUAL"
      ? providerControlCapabilities(subscription.provider)
      : null,
  };
}

export async function createPaymentManagementSession(input: unknown) {
  const owner = await authorizedOwner(input, "manage");
  const activeSubscription = await prisma.subscription.findFirst({
    where: { ownerType: owner.ownerType, ownerId: owner.ownerId, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE] } },
    orderBy: { updatedAt: "desc" },
  });
  if (activeSubscription?.provider === "MANUAL") {
    throw new Error("Payment methods for this recorded subscription are managed outside this application.");
  }
  const provider = activeSubscription ? getPaymentProviderByName(activeSubscription.provider) : getPaymentProvider();
  if (!provider.capabilities.supportsPaymentMethodManagement) {
    throw new Error("Payment method management is provided by the Razorpay subscription checkout and is not available as a separate portal.");
  }
  const customer = await prisma.billingCustomer.findUnique({
    where: { ownerType_ownerId_provider: { ...owner, provider: provider.name } },
  });
  if (!customer) throw new Error("No billing customer exists yet.");
  const url = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return provider.createPaymentMethodManagementSession(customer.providerCustomerId, `${url}/settings/billing`);
}

export async function changeSubscriptionPlan(input: unknown) {
  const schema = ownerInputSchema.extend({ planId: z.string().min(1), interval: z.enum(["MONTHLY", "YEARLY"]) });
  const parsed = schema.parse(input);
  const session = await assertOwnerAccess(parsed.ownerType, parsed.ownerId, "manage");
  const current = await prisma.subscription.findFirst({
    where: { ownerType: parsed.ownerType, ownerId: parsed.ownerId, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE] } },
    orderBy: { updatedAt: "desc" },
  });
  if (!current) throw new Error("No active subscription was found.");
  if (current.provider === "MANUAL") throw new Error("This recorded subscription cannot be changed through a payment provider.");
  const provider = getPaymentProviderByName(current.provider);
  const plan = await prisma.subscriptionPlan.findFirst({ where: { id: parsed.planId, active: true } });
  if (!plan) throw new Error("The selected plan is unavailable.");
  const price = parsed.interval === "MONTHLY" ? plan.monthlyPrice : plan.yearlyPrice;
  if (price < 1) {
    if (current.cancelAtPeriodEnd) return current;
    const canceled = retainPaidPeriodForScheduledCancellation(
      await provider.cancelSubscription(current.providerSubscriptionId, true),
      current.status,
    );
    return persistSubscription(prisma, provider.name, canceled, {
      ownerType: current.ownerType,
      ownerId: current.ownerId,
      planId: current.planId,
      interval: current.interval,
      providerCustomerId: current.providerCustomerId,
    }, { retainPaidPeriod: true });
  }
  // A subscription that is already scheduled to end cannot be mutated on
  // providers such as Razorpay, so a new authorization is required even when
  // the customer still has access for the remainder of the paid period.
  if (current.cancelAtPeriodEnd && !provider.capabilities.supportsRenewalResume) {
    return startPlanChangeCheckout({
      provider,
      user: { id: session.user.id, email: session.user.email, name: session.user.name },
      ownerType: current.ownerType,
      ownerId: current.ownerId,
      current,
      plan,
      interval: parsed.interval,
    });
  }
  const providerPlan = providerPlanDetails(plan, provider.name, parsed.interval);
  const subscriptionMetadata = {
    ownerType: parsed.ownerType,
    ownerId: parsed.ownerId,
    planId: plan.id,
    interval: parsed.interval,
  };
  let updated: ProviderSubscription;
  try {
    updated = await provider.updateSubscription(
      current.providerSubscriptionId,
      providerPlan.id,
      parsed.interval,
      providerPlan.totalBillingCycles,
      subscriptionMetadata,
    );
  } catch (error) {
    if (!(error instanceof ProviderSubscriptionNotUpdatableError)) throw error;
    // Providers such as Razorpay permanently lock UPI/eMandate mandates. The
    // only supported upgrade path is a new subscription that the customer
    // authorizes again, so hand the client a fresh checkout.
    return startPlanChangeCheckout({
      provider,
      user: { id: session.user.id, email: session.user.email, name: session.user.name },
      ownerType: current.ownerType,
      ownerId: current.ownerId,
      current,
      plan,
      interval: parsed.interval,
    });
  }
  return persistSubscription(prisma, provider.name, updated, {
    ownerType: current.ownerType,
    ownerId: current.ownerId,
    planId: plan.id,
    interval: parsed.interval,
    providerCustomerId: current.providerCustomerId,
  });
}

/**
 * Creates a replacement subscription when the current mandate cannot be
 * updated in place. The old subscription is intentionally left active until
 * the replacement has been paid and verified, so abandoning checkout does
 * not revoke the customer's existing access.
 */
async function startPlanChangeCheckout(args: {
  provider: PaymentProvider;
  user: { id: string; email: string; name: string };
  ownerType: BillingOwnerType;
  ownerId: string;
  current: { providerSubscriptionId: string; providerCustomerId: string };
  plan: {
    id: string;
    name: string;
    currency: string;
    monthlyPrice: number;
    yearlyPrice: number;
    stripeMonthlyPriceId: string | null;
    stripeYearlyPriceId: string | null;
    razorpayMonthlyPlanId: string | null;
    razorpayYearlyPlanId: string | null;
    razorpayMonthlyCycles: number | null;
    razorpayYearlyCycles: number | null;
  };
  interval: BillingInterval;
}) {
  const providerPlan = providerPlanDetails(args.plan, args.provider.name, args.interval);
  const price = args.interval === BillingInterval.MONTHLY ? args.plan.monthlyPrice : args.plan.yearlyPrice;
  const baseUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const result = await args.provider.createCheckout({
    customerId: args.current.providerCustomerId,
    customerEmail: args.user.email,
    customerName: args.user.name,
    planId: args.plan.id,
    planName: args.plan.name,
    providerPlanId: providerPlan.id,
    interval: args.interval,
    currency: args.plan.currency,
    amount: price,
    successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${baseUrl}/checkout/cancel`,
    totalBillingCycles: providerPlan.totalBillingCycles,
    metadata: {
      ownerType: args.ownerType,
      ownerId: args.ownerId,
      planId: args.plan.id,
      interval: args.interval,
      initiatedByUserId: args.user.id,
      replacesSubscriptionId: args.current.providerSubscriptionId,
    },
  });
  await prisma.checkoutAttempt.create({
    data: {
      ownerType: args.ownerType,
      ownerId: args.ownerId,
      initiatedByUserId: args.user.id,
      planId: args.plan.id,
      provider: args.provider.name,
      interval: args.interval,
      providerCustomerId: args.current.providerCustomerId,
      providerCheckoutId: result.checkoutId,
      providerSubscriptionId: result.kind === "razorpay-subscription" ? result.subscriptionId : null,
      checkoutUrl: result.kind === "redirect" ? result.url : null,
    },
  });
  return result;
}

/**
 * Cancels the subscription that a verified replacement superseded. Failures
 * are logged instead of failing verification because the replacement has
 * already been paid for; a later webhook will attempt the same reconciliation.
 */
async function cancelSupersededSubscription(
  provider: PaymentProvider,
  owner: { ownerType: BillingOwnerType; ownerId: string },
  providerSubscriptionId: string,
) {
  const existing = await prisma.subscription.findUnique({
    where: { provider_providerSubscriptionId: { provider: provider.name, providerSubscriptionId } },
  });
  if (!existing || existing.ownerType !== owner.ownerType || existing.ownerId !== owner.ownerId) return;
  if (existing.status === SubscriptionStatus.CANCELED || existing.status === SubscriptionStatus.INCOMPLETE_EXPIRED) return;
  const persist = (value: ProviderSubscription) => persistSubscription(prisma, provider.name, value, {
    ownerType: existing.ownerType,
    ownerId: existing.ownerId,
    planId: existing.planId,
    interval: existing.interval,
    providerCustomerId: existing.providerCustomerId,
  }, { retainPaidPeriod: false });
  try {
    await persist(await provider.cancelSubscription(providerSubscriptionId, false));
  } catch (error) {
    console.error(`Unable to cancel superseded ${provider.name} subscription ${providerSubscriptionId}.`, error);
    try {
      const remote = await provider.retrieveSubscription(providerSubscriptionId);
      if (remote.status === "canceled" || remote.status === "incomplete_expired") await persist(remote);
    } catch (reconcileError) {
      console.error(`Unable to reconcile superseded ${provider.name} subscription ${providerSubscriptionId}.`, reconcileError);
    }
  }
}

export async function cancelCurrentSubscription(input: unknown, atPeriodEnd = true) {
  if (typeof atPeriodEnd !== "boolean") throw new Error("Invalid cancellation option.");
  const owner = await authorizedOwner(input, "manage");
  const current = await prisma.subscription.findFirst({
    where: { ownerType: owner.ownerType, ownerId: owner.ownerId, status: { in: [...liveSubscriptionStatuses] } },
    orderBy: { updatedAt: "desc" },
  });
  if (!current) throw new Error("No active subscription was found.");
  if (atPeriodEnd && current.cancelAtPeriodEnd) return current;
  if (current.provider === "MANUAL") throw new Error("This recorded subscription cannot be canceled through a payment provider.");
  const provider = getPaymentProviderByName(current.provider);
  const updated = atPeriodEnd
    ? retainPaidPeriodForScheduledCancellation(
        await provider.cancelSubscription(current.providerSubscriptionId, true),
        current.status,
      )
    : await provider.cancelSubscription(current.providerSubscriptionId, false);
  const persisted = await persistSubscription(prisma, provider.name, updated, {
    ownerType: current.ownerType,
    ownerId: current.ownerId,
    planId: current.planId,
    interval: current.interval,
    providerCustomerId: current.providerCustomerId,
  }, { retainPaidPeriod: atPeriodEnd });
  console.info(
    `Billing: ${atPeriodEnd ? "scheduled cancellation at period end" : "cancelled immediately"} for ${current.ownerType}:${current.ownerId} (${provider.name} ${current.providerSubscriptionId}).`,
  );
  return persisted;
}

export async function resumeCurrentSubscription(input: unknown) {
  const owner = await authorizedOwner(input, "manage");
  const current = await prisma.subscription.findFirst({
    where: {
      ownerType: owner.ownerType,
      ownerId: owner.ownerId,
      status: { in: [...liveSubscriptionStatuses, SubscriptionStatus.PAUSED] },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!current) throw new Error("No resumable subscription was found.");
  if (current.provider === "MANUAL") throw new Error("This recorded subscription cannot be resumed through a payment provider.");
  const provider = getPaymentProviderByName(current.provider);
  if (current.status === SubscriptionStatus.PAUSED) {
    if (!provider.capabilities.supportsResume) {
      throw new Error("This payment provider does not support resuming subscriptions.");
    }
  } else {
    if (!current.cancelAtPeriodEnd) {
      throw new Error("Automatic renewal is already enabled.");
    }
    if (!provider.capabilities.supportsRenewalResume) {
      throw new Error("This payment provider cannot undo a scheduled cancellation. Subscribe again after the current period ends.");
    }
  }
  const updated = await provider.resumeSubscription(current.providerSubscriptionId);
  const persisted = await persistSubscription(prisma, provider.name, updated, {
    ownerType: current.ownerType,
    ownerId: current.ownerId,
    planId: current.planId,
    interval: current.interval,
    providerCustomerId: current.providerCustomerId,
  }, { cancelAtPeriodEnd: false });
  console.info(
    `Billing: resumed automatic renewal for ${current.ownerType}:${current.ownerId} (${provider.name} ${current.providerSubscriptionId}).`,
  );
  return persisted;
}

/**
 * Ends subscriptions whose paid period has definitively passed. Provider
 * subscriptions with a scheduled end are included so the UI cannot keep
 * showing access after the period ends while a webhook is delayed.
 */
async function expireEndedSubscriptions(ownerType: BillingOwnerType, ownerId: string) {
  const now = new Date();
  await prisma.subscription.updateMany({
    where: {
      ownerType,
      ownerId,
      provider: "MANUAL",
      status: { in: [...liveSubscriptionStatuses] },
      currentPeriodEnd: { lte: now },
    },
    data: { status: SubscriptionStatus.CANCELED, endedAt: now, cancelAtPeriodEnd: false, nextBillingDate: null },
  });
  await prisma.subscription.updateMany({
    where: {
      ownerType,
      ownerId,
      provider: { in: ["STRIPE", "RAZORPAY"] },
      status: { in: [...liveSubscriptionStatuses] },
      cancelAtPeriodEnd: true,
      OR: [
        { currentPeriodEnd: { lte: now } },
        { currentPeriodEnd: null, nextBillingDate: { lte: now } },
      ],
    },
    data: { status: SubscriptionStatus.CANCELED, endedAt: now, cancelAtPeriodEnd: false, nextBillingDate: null },
  });
}

export async function listBillingHistory(input: unknown) {
  const owner = await authorizedOwner(input, "read");
  try { await refreshProviderHistory(owner); }
  catch { console.error("Unable to refresh billing history from the payment provider."); }
  const [invoices, payments, customer] = await Promise.all([
    prisma.invoice.findMany({ where: owner, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.payment.findMany({ where: owner, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.billingCustomer.findFirst({ where: owner, orderBy: { updatedAt: "desc" } }),
  ]);
  return { invoices, payments, customer };
}

export const getBillingHistory = listBillingHistory;

async function persistSubscription(
  client: Pick<typeof prisma, "subscription">,
  provider: PaymentProviderName,
  value: ProviderSubscription,
  owner: { ownerType: BillingOwnerType; ownerId: string; planId: string; interval: BillingInterval; providerCustomerId: string },
  options: { cancelAtPeriodEnd?: boolean; retainPaidPeriod?: boolean } = {},
) {
  const existing = await client.subscription.findUnique({
    where: { provider_providerSubscriptionId: { provider, providerSubscriptionId: value.id } },
    select: {
      cancelAtPeriodEnd: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      nextBillingDate: true,
    },
  });
  const currentPeriodStart = value.currentPeriodStart ?? existing?.currentPeriodStart ?? null;
  const currentPeriodEnd = value.currentPeriodEnd ?? existing?.currentPeriodEnd ?? null;
  const nextBillingDate = value.nextBillingDate ?? existing?.nextBillingDate ?? null;
  if (
    (options.retainPaidPeriod ?? true) &&
    value.status === "canceled" &&
    existing?.cancelAtPeriodEnd
  ) {
    const periodEnd = currentPeriodEnd ?? nextBillingDate;
    if (periodEnd && periodEnd.getTime() > Date.now()) {
      // A subscription that was scheduled to end must keep its paid access
      // until the period actually ends, even if the provider emits an early
      // terminal event or reports an early `ended_at`.
      value = {
        ...value,
        status: providerStatusForLocalStatus(existing.status),
        endedAt: null,
        canceledAt: null,
        cancelAtPeriodEnd: true,
      };
    }
  }
  const terminal = value.status === "canceled" || value.status === "incomplete_expired";
  let cancelAtPeriodEnd = terminal ? false : options.cancelAtPeriodEnd ?? value.cancelAtPeriodEnd;
  if (
    !terminal &&
    !cancelAtPeriodEnd &&
    provider === "RAZORPAY" &&
    liveProviderStatusSet.has(value.status) &&
    existing?.cancelAtPeriodEnd
  ) {
    // Razorpay does not surface cycle-end cancellations on the subscription
    // entity (`has_scheduled_changes` stays false), so an unrelated webhook
    // must not silently re-enable automatic renewal.
    cancelAtPeriodEnd = true;
  }
  return client.subscription.upsert({
    where: { provider_providerSubscriptionId: { provider, providerSubscriptionId: value.id } },
    create: {
      ...owner,
      provider,
      providerSubscriptionId: value.id,
      status: statusMap[value.status],
      currentPeriodStart,
      currentPeriodEnd,
      nextBillingDate,
      cancelAtPeriodEnd,
      canceledAt: value.canceledAt,
      endedAt: value.endedAt,
    },
    update: {
      planId: owner.planId,
      interval: owner.interval,
      status: statusMap[value.status],
      currentPeriodStart,
      currentPeriodEnd,
      nextBillingDate,
      cancelAtPeriodEnd,
      canceledAt: value.canceledAt,
      endedAt: value.endedAt,
      providerCustomerId: value.customerId || owner.providerCustomerId,
    },
  });
}

async function persistInvoice(
  tx: Prisma.TransactionClient,
  provider: PaymentProviderName,
  value: ProviderInvoice,
  owner: { ownerType: BillingOwnerType; ownerId: string },
) {
  const subscription = value.subscriptionId
    ? await tx.subscription.findUnique({ where: { provider_providerSubscriptionId: { provider, providerSubscriptionId: value.subscriptionId } }, select: { id: true } })
    : null;
  await tx.invoice.upsert({
    where: { provider_providerInvoiceId: { provider, providerInvoiceId: value.id } },
    create: {
      ownerType: owner.ownerType,
      ownerId: owner.ownerId,
      provider,
      providerInvoiceId: value.id,
      subscriptionId: subscription?.id,
      amountDue: value.amountDue,
      amountPaid: value.amountPaid,
      currency: value.currency,
      status: value.status,
      hostedInvoiceUrl: value.hostedUrl,
      invoicePdfUrl: value.pdfUrl,
      periodStart: value.periodStart,
      periodEnd: value.periodEnd,
      paidAt: value.paidAt,
    },
    update: {
      subscriptionId: subscription?.id,
      amountDue: value.amountDue,
      amountPaid: value.amountPaid,
      status: value.status,
      hostedInvoiceUrl: value.hostedUrl,
      invoicePdfUrl: value.pdfUrl,
      periodStart: value.periodStart,
      periodEnd: value.periodEnd,
      paidAt: value.paidAt,
    },
  });
}

async function persistPayment(
  tx: Prisma.TransactionClient,
  provider: PaymentProviderName,
  value: ProviderPayment,
  owner: { ownerType: BillingOwnerType; ownerId: string },
) {
  let subscriptionId: string | null = null;
  if (value.subscriptionId) {
    const subscription = await tx.subscription.findUnique({
      where: { provider_providerSubscriptionId: { provider, providerSubscriptionId: value.subscriptionId } },
      select: { id: true },
    });
    subscriptionId = subscription?.id ?? null;
  } else if (value.invoiceId) {
    const invoice = await tx.invoice.findUnique({
      where: { provider_providerInvoiceId: { provider, providerInvoiceId: value.invoiceId } },
      select: { subscriptionId: true },
    });
    subscriptionId = invoice?.subscriptionId ?? null;
  }
  const providerStatus = value.status === "succeeded" ? PaymentStatus.SUCCEEDED
    : value.status === "failed" ? PaymentStatus.FAILED
      : value.status === "refunded" ? PaymentStatus.REFUNDED
        : value.status === "partially_refunded" ? PaymentStatus.PARTIALLY_REFUNDED
        : PaymentStatus.PENDING;
  const existing = await tx.payment.findUnique({
    where: { provider_providerPaymentId: { provider, providerPaymentId: value.id } },
    select: { status: true, paidAt: true },
  });
  const status = existing && paymentStatusRank[existing.status] > paymentStatusRank[providerStatus]
    ? existing.status
    : providerStatus;
  const paidAt = value.paidAt ?? existing?.paidAt ?? null;
  await tx.payment.upsert({
    where: { provider_providerPaymentId: { provider, providerPaymentId: value.id } },
    create: {
      ownerType: owner.ownerType,
      ownerId: owner.ownerId,
      provider,
      providerPaymentId: value.id,
      subscriptionId,
      amount: value.amount,
      currency: value.currency,
      status,
      description: value.description,
      paidAt,
    },
    update: {
      subscriptionId,
      amount: value.amount,
      currency: value.currency,
      status,
      description: value.description,
      paidAt,
    },
  });
}

export async function processVerifiedProviderEvent(provider: PaymentProviderName, event: ProviderWebhookEvent, payload: Prisma.InputJsonValue) {
  await prisma.paymentEvent.upsert({
    where: { provider_externalEventId: { provider, externalEventId: event.id } },
    create: { provider, externalEventId: event.id, eventType: event.type, payload },
    update: {},
  });
  const stored = await prisma.paymentEvent.findUniqueOrThrow({ where: { provider_externalEventId: { provider, externalEventId: event.id } } });
  if (stored.processedAt) return { duplicate: true };

  try {
    await prisma.$transaction(async (tx) => {
      const metadata = event.subscription?.metadata ?? {};
      const metadataOwnerType = metadata.ownerType === "ORGANIZATION" ? BillingOwnerType.ORGANIZATION
        : metadata.ownerType === "USER" ? BillingOwnerType.USER : null;
      const metadataOwner = metadataOwnerType && metadata.ownerId
        ? { ownerType: metadataOwnerType, ownerId: metadata.ownerId }
        : null;
      const externalCustomerId = event.subscription?.customerId || event.invoice?.customerId || event.payment?.customerId;
      const relatedSubscriptionId = event.payment?.subscriptionId ?? event.subscription?.id ?? event.invoice?.subscriptionId ?? null;
      const checkoutAttempt = await tx.checkoutAttempt.findFirst({
        where: {
          provider,
          OR: [
            ...(relatedSubscriptionId ? [{ providerSubscriptionId: relatedSubscriptionId }] : []),
            ...(event.subscription
              ? [
                  { providerSubscriptionId: event.subscription.id },
                  ...(event.checkoutId ? [{ providerCheckoutId: event.checkoutId }] : []),
                  { providerCheckoutId: event.subscription.id },
                ]
              : [{ providerCheckoutId: event.id }]),
          ],
        },
        orderBy: { createdAt: "desc" },
      });
      const persistedSubscription = relatedSubscriptionId
        ? await tx.subscription.findUnique({
            where: { provider_providerSubscriptionId: { provider, providerSubscriptionId: relatedSubscriptionId } },
            select: { ownerType: true, ownerId: true },
          })
        : null;
      // Razorpay deduplicates customers by email, so a single provider customer
      // can be shared by several billing owners. Only treat the customer mapping
      // as ownership when exactly one owner references it.
      const customerOwners = externalCustomerId
        ? await tx.billingCustomer.findMany({
            where: { provider, providerCustomerId: externalCustomerId },
            select: { ownerType: true, ownerId: true },
          })
        : [];
      const customerOwner = customerOwners.length === 1 ? customerOwners[0] : null;
      const checkoutOwner = checkoutAttempt
        ? { ownerType: checkoutAttempt.ownerType, ownerId: checkoutAttempt.ownerId }
        : null;
      // The owner recorded on the subscription (or checkout attempt) is the most
      // specific signal and stays correct when the provider customer is shared.
      const owner = metadataOwner ?? checkoutOwner ?? persistedSubscription ?? customerOwner;
      let billingCustomer = owner
        ? await tx.billingCustomer.findUnique({ where: { ownerType_ownerId_provider: { ...owner, provider } } })
        : null;

      const conflictingOwner = [checkoutOwner, persistedSubscription].find(
        (candidate) => candidate && owner && (candidate.ownerType !== owner.ownerType || candidate.ownerId !== owner.ownerId),
      );
      if (conflictingOwner) {
        // Metadata is authoritative because it is written when the provider
        // subscription is created. Never fail the webhook over a shared
        // customer or stale local mapping.
        console.warn("Provider event owner disagrees with stored billing ownership.", {
          provider,
          eventId: event.id,
          eventType: event.type,
          selectedOwner: owner,
          metadataOwner,
          checkoutOwner,
          persistedSubscription,
          customerOwners,
        });
      }

      if (event.subscription && owner) {
        const providerPlan = event.subscription.providerPlanId
          ? await tx.subscriptionPlan.findFirst({
              where: provider === "STRIPE"
                ? { OR: [{ stripeMonthlyPriceId: event.subscription.providerPlanId }, { stripeYearlyPriceId: event.subscription.providerPlanId }] }
                : { OR: [{ razorpayMonthlyPlanId: event.subscription.providerPlanId }, { razorpayYearlyPlanId: event.subscription.providerPlanId }] },
              select: {
                id: true,
                stripeMonthlyPriceId: true,
                stripeYearlyPriceId: true,
                razorpayMonthlyPlanId: true,
                razorpayYearlyPlanId: true,
              },
            })
          : null;
        const providerPlanIsMonthly = provider === "STRIPE"
          ? providerPlan?.stripeMonthlyPriceId === event.subscription.providerPlanId
          : providerPlan?.razorpayMonthlyPlanId === event.subscription.providerPlanId;
        const planId = providerPlan?.id ?? metadata.planId ?? checkoutAttempt?.planId;
        const intervalValue = providerPlan
          ? providerPlanIsMonthly ? BillingInterval.MONTHLY : BillingInterval.YEARLY
          : metadata.interval ?? checkoutAttempt?.interval;
        if (planId && intervalValue && Object.values(BillingInterval).includes(intervalValue as BillingInterval)) {
          const ownerExists = owner.ownerType === BillingOwnerType.USER
            ? await tx.user.findUnique({ where: { id: owner.ownerId }, select: { id: true } })
            : await tx.organization.findUnique({ where: { id: owner.ownerId }, select: { id: true } });
          if (!ownerExists) throw new Error("The provider subscription references an unknown billing owner.");
          const localPlan = await tx.subscriptionPlan.findUnique({ where: { id: planId }, select: { id: true } });
          if (!localPlan) throw new Error("The provider subscription references an unknown plan.");
          if (event.subscription.customerId) {
            const initiatingUser = checkoutAttempt
              ? await tx.user.findUnique({ where: { id: checkoutAttempt.initiatedByUserId }, select: { email: true } })
              : null;
            billingCustomer = await tx.billingCustomer.upsert({
              where: { ownerType_ownerId_provider: { ...owner, provider } },
              create: {
                ...owner,
                provider,
                providerCustomerId: event.subscription.customerId,
                email: initiatingUser?.email ?? billingCustomer?.email ?? "billing@unavailable.invalid",
              },
              update: {
                providerCustomerId: event.subscription.customerId,
                ...(initiatingUser?.email ? { email: initiatingUser.email } : {}),
              },
            });
          }
          await persistSubscription(tx, provider, event.subscription, {
            ownerType: owner.ownerType,
            ownerId: owner.ownerId,
            planId,
            interval: intervalValue as BillingInterval,
            providerCustomerId: event.subscription.customerId || billingCustomer?.providerCustomerId || checkoutAttempt?.providerCustomerId || "",
          });
        }
        await tx.checkoutAttempt.updateMany({
          where: {
            provider,
            OR: [
              { providerSubscriptionId: event.subscription.id },
              ...(event.checkoutId ? [{ providerCheckoutId: event.checkoutId }] : []),
              { providerCheckoutId: event.subscription.id },
            ],
          },
          data: { status: event.subscription.status === "active" ? "completed" : event.subscription.status },
        });
      }

      let eventOwner = owner;
      if (!eventOwner && event.payment?.invoiceId) {
        const persistedInvoice = await tx.invoice.findUnique({
          where: { provider_providerInvoiceId: { provider, providerInvoiceId: event.payment.invoiceId } },
          select: { ownerType: true, ownerId: true },
        });
        if (persistedInvoice) eventOwner = { ownerType: persistedInvoice.ownerType, ownerId: persistedInvoice.ownerId };
      }
      if (!eventOwner && event.payment?.customerId) {
        const customerOwnersForPayment = await tx.billingCustomer.findMany({
          where: { provider, providerCustomerId: event.payment.customerId },
          select: { ownerType: true, ownerId: true },
        });
        if (customerOwnersForPayment.length === 1) eventOwner = customerOwnersForPayment[0];
      }
      if (eventOwner && event.invoice) {
        await persistInvoice(tx, provider, event.invoice, eventOwner);
      }
      if (eventOwner && event.payment) {
        await persistPayment(tx, provider, {
          ...event.payment,
          subscriptionId: relatedSubscriptionId ?? null,
        }, eventOwner);
      }

      await tx.paymentEvent.update({ where: { id: stored.id }, data: { processedAt: new Date(), attempts: { increment: 1 }, lastError: null } });
      if (checkoutAttempt && !event.subscription) {
        await tx.checkoutAttempt.update({ where: { id: checkoutAttempt.id }, data: { status: "processed" } });
      }
    });
    if (event.subscription?.status === "active" && event.subscription.metadata.replacesSubscriptionId) {
      const replacement = await prisma.subscription.findUnique({
        where: { provider_providerSubscriptionId: { provider, providerSubscriptionId: event.subscription.id } },
        select: { ownerType: true, ownerId: true },
      });
      if (replacement) {
        await cancelSupersededSubscription(
          getPaymentProviderByName(provider),
          replacement,
          event.subscription.metadata.replacesSubscriptionId,
        );
      }
    }
    return { duplicate: false };
  } catch (error) {
    await prisma.paymentEvent.update({
      where: { id: stored.id },
      data: { attempts: { increment: 1 }, lastError: error instanceof Error ? error.message.slice(0, 1000) : "Unknown processing error" },
    });
    throw error;
  }
}

export async function verifyRazorpayCheckout(input: unknown) {
  const schema = ownerInputSchema.extend({
    paymentId: z.string().min(1),
    subscriptionId: z.string().min(1),
    signature: z.string().min(1),
  });
  const parsed = schema.parse(input);
  await assertOwnerAccess(parsed.ownerType, parsed.ownerId, "manage");
  const attempt = await prisma.checkoutAttempt.findFirst({
    where: {
      provider: "RAZORPAY",
      providerSubscriptionId: parsed.subscriptionId,
      ownerType: parsed.ownerType,
      ownerId: parsed.ownerId,
    },
  });
  if (!attempt?.providerSubscriptionId) throw new Error("The checkout does not belong to this account.");
  const providerSubscriptionId = attempt.providerSubscriptionId;
  const provider = getPaymentProviderByName("RAZORPAY");
  if (!(await provider.verifyCheckout({
    paymentId: parsed.paymentId,
    subscriptionId: providerSubscriptionId,
    signature: parsed.signature,
  }))) throw new Error("Razorpay checkout signature verification failed.");
  const remote = await provider.retrieveSubscription(providerSubscriptionId);
  const payment = await provider.retrievePayment(parsed.paymentId);
  if (payment.status === "failed" || payment.status === "refunded" || payment.status === "partially_refunded") {
    throw new Error("Razorpay has not confirmed a payment for this subscription.");
  }
  await prisma.$transaction(async (tx) => {
    await persistSubscription(tx, "RAZORPAY", remote, {
      ownerType: attempt.ownerType,
      ownerId: attempt.ownerId,
      planId: attempt.planId,
      interval: attempt.interval,
      providerCustomerId: remote.customerId || attempt.providerCustomerId,
    });
    if (remote.customerId) {
      await tx.billingCustomer.update({
        where: { ownerType_ownerId_provider: { ownerType: attempt.ownerType, ownerId: attempt.ownerId, provider: "RAZORPAY" } },
        data: { providerCustomerId: remote.customerId },
      });
    }
    await persistPayment(tx, "RAZORPAY", {
      ...payment,
      subscriptionId: providerSubscriptionId,
    }, { ownerType: attempt.ownerType, ownerId: attempt.ownerId });
    await tx.checkoutAttempt.update({
      where: { id: attempt.id },
      data: { status: "completed" },
    });
  });
  const replacementIsLive = remote.status === "active" || remote.status === "trialing";
  if (payment.status === "succeeded" && replacementIsLive && remote.metadata.replacesSubscriptionId) {
    await cancelSupersededSubscription(
      provider,
      { ownerType: attempt.ownerType, ownerId: attempt.ownerId },
      remote.metadata.replacesSubscriptionId,
    );
  }
  return { subscriptionStatus: remote.status };
}

export async function refreshProviderHistory(input: unknown) {
  const owner = await authorizedOwner(input, "read");
  const currentSubscription = await prisma.subscription.findFirst({
    where: {
      ownerType: owner.ownerType,
      ownerId: owner.ownerId,
      status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE, SubscriptionStatus.PAUSED] },
    },
    orderBy: { updatedAt: "desc" },
    select: { provider: true },
  });
  const providerName = currentSubscription?.provider === "STRIPE" || currentSubscription?.provider === "RAZORPAY"
    ? currentSubscription.provider
    : process.env.PAYMENT_PROVIDER?.toUpperCase();
  if (providerName !== "STRIPE" && providerName !== "RAZORPAY") return;
  const customer = await prisma.billingCustomer.findUnique({
    where: { ownerType_ownerId_provider: { ...owner, provider: providerName } },
  });
  if (!customer) return;
  // Razorpay deduplicates customers by email, so a user and an organization
  // can share one provider customer. When that happens, only history tied to
  // this owner's subscriptions may be attributed to this owner.
  const sharedCustomer = (await prisma.billingCustomer.count({
    where: { provider: providerName, providerCustomerId: customer.providerCustomerId },
  })) > 1;
  const ownedProviderSubscriptionIds = new Set(
    sharedCustomer
      ? (await prisma.subscription.findMany({
          where: owner,
          select: { providerSubscriptionId: true },
        })).map((subscription) => subscription.providerSubscriptionId)
      : [],
  );
  const provider = getPaymentProviderByName(providerName);
  const paymentMethodsPromise = provider.capabilities.supportsPaymentMethodManagement
    ? provider.listPaymentMethods(customer.providerCustomerId)
    : Promise.resolve([]);
  const [invoices, payments, paymentMethods] = await Promise.all([
    provider.listInvoices(customer.providerCustomerId),
    provider.listPayments(customer.providerCustomerId),
    paymentMethodsPromise,
  ]);
  const ownedInvoices = sharedCustomer
    ? invoices.filter((invoice) => invoice.subscriptionId && ownedProviderSubscriptionIds.has(invoice.subscriptionId))
    : invoices;
  const ownedInvoiceIds = new Set(ownedInvoices.map((invoice) => invoice.id));
  const ownedPayments = sharedCustomer
    ? payments.filter((payment) =>
        (payment.subscriptionId ? ownedProviderSubscriptionIds.has(payment.subscriptionId) : false) ||
        (payment.invoiceId ? ownedInvoiceIds.has(payment.invoiceId) : false),
      )
    : payments;
  await prisma.$transaction(async (tx) => {
    for (const invoice of ownedInvoices) await persistInvoice(tx, providerName, invoice, owner);
    for (const payment of ownedPayments) await persistPayment(tx, providerName, payment, owner);
    await tx.paymentMethod.deleteMany({
      where: {
        ...owner,
        provider: providerName,
        ...(paymentMethods.length ? { providerPaymentMethodId: { notIn: paymentMethods.map((method) => method.id) } } : {}),
      },
    });
    for (const method of paymentMethods) {
      await tx.paymentMethod.upsert({
        where: { provider_providerPaymentMethodId: { provider: providerName, providerPaymentMethodId: method.id } },
        create: {
          ...owner,
          provider: providerName,
          providerPaymentMethodId: method.id,
          type: method.type,
          brand: method.brand,
          last4: method.last4,
          expiryMonth: method.expiryMonth,
          expiryYear: method.expiryYear,
          isDefault: method.isDefault,
        },
        update: {
          type: method.type,
          brand: method.brand,
          last4: method.last4,
          expiryMonth: method.expiryMonth,
          expiryYear: method.expiryYear,
          isDefault: method.isDefault,
        },
      });
    }
  });
}

export async function refundOwnerPayment(input: unknown) {
  const schema = ownerInputSchema.extend({ paymentId: z.string().min(1), amount: z.number().int().positive().optional() });
  const parsed = schema.parse(input);
  await assertOwnerAccess(parsed.ownerType, parsed.ownerId, "manage");
  const payment = await prisma.payment.findFirst({
    where: { ownerType: parsed.ownerType, ownerId: parsed.ownerId, providerPaymentId: parsed.paymentId, status: PaymentStatus.SUCCEEDED },
  });
  if (!payment) throw new Error("A refundable payment for this account was not found.");
  if (payment.provider === "MANUAL") throw new Error("This recorded payment cannot be refunded through a payment provider.");
  if (parsed.amount && parsed.amount > payment.amount) throw new Error("Refund amount cannot exceed the captured payment amount.");
  const provider = getPaymentProviderByName(payment.provider);
  if (!provider.capabilities.supportsRefunds) throw new Error("Refunds are not supported by this payment provider.");
  const result = await provider.refund(payment.providerPaymentId, parsed.amount);
  const fullRefund = !parsed.amount || parsed.amount >= payment.amount;
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: fullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED },
  });
  return result;
}
