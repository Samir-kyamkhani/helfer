import "server-only";
import { BillingInterval, BillingOwnerType, PaymentStatus, SubscriptionStatus } from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider, getPaymentProviderByName } from "@/lib/payments/factory";
import type {
  BillingOwnerKind,
  PaymentProviderName,
  ProviderInvoice,
  ProviderPayment,
  ProviderSubscription,
  ProviderWebhookEvent,
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
  await expireUnmanagedSubscriptions(parsed.ownerType, parsed.ownerId);

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
  await expireUnmanagedSubscriptions(owner.ownerType, owner.ownerId);
  try { await refreshProviderHistory(owner); }
  catch { console.error("Unable to refresh billing provider history for this account."); }
  const [subscription, customer, paymentMethods] = await Promise.all([
    prisma.subscription.findFirst({
      where: { ownerType: owner.ownerType, ownerId: owner.ownerId },
      include: { plan: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.billingCustomer.findFirst({ where: { ownerType: owner.ownerType, ownerId: owner.ownerId } }),
    prisma.paymentMethod.findMany({ where: { ownerType: owner.ownerType, ownerId: owner.ownerId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
  ]);
  return { owner, subscription, customer, paymentMethods, provider: subscription?.provider ?? process.env.PAYMENT_PROVIDER?.toUpperCase() ?? null };
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
  await assertOwnerAccess(parsed.ownerType, parsed.ownerId, "manage");
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
    const canceled = await provider.cancelSubscription(current.providerSubscriptionId, true);
    return persistSubscription(prisma, provider.name, canceled, {
      ownerType: current.ownerType,
      ownerId: current.ownerId,
      planId: current.planId,
      interval: current.interval,
      providerCustomerId: current.providerCustomerId,
    });
  }
  const providerPlan = providerPlanDetails(plan, provider.name, parsed.interval);
  const subscriptionMetadata = {
    ownerType: parsed.ownerType,
    ownerId: parsed.ownerId,
    planId: plan.id,
    interval: parsed.interval,
  };
  const updated = await provider.updateSubscription(
    current.providerSubscriptionId,
    providerPlan.id,
    parsed.interval,
    providerPlan.totalBillingCycles,
    subscriptionMetadata,
  );
  return persistSubscription(prisma, provider.name, updated, {
    ownerType: current.ownerType,
    ownerId: current.ownerId,
    planId: plan.id,
    interval: parsed.interval,
    providerCustomerId: current.providerCustomerId,
  });
}

export async function cancelCurrentSubscription(input: unknown, atPeriodEnd = true) {
  const owner = await authorizedOwner(input, "manage");
  const current = await prisma.subscription.findFirst({
    where: { ownerType: owner.ownerType, ownerId: owner.ownerId, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE] } },
    orderBy: { updatedAt: "desc" },
  });
  if (!current) throw new Error("No active subscription was found.");
  if (current.provider === "MANUAL") throw new Error("This recorded subscription cannot be canceled through a payment provider.");
  const provider = getPaymentProviderByName(current.provider);
  const updated = await provider.cancelSubscription(current.providerSubscriptionId, atPeriodEnd);
  return persistSubscription(prisma, provider.name, updated, {
    ownerType: current.ownerType,
    ownerId: current.ownerId,
    planId: current.planId,
    interval: current.interval,
    providerCustomerId: current.providerCustomerId,
  });
}

export async function resumeCurrentSubscription(input: unknown) {
  const owner = await authorizedOwner(input, "manage");
  const current = await prisma.subscription.findFirst({
    where: { ownerType: owner.ownerType, ownerId: owner.ownerId, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED] } },
    orderBy: { updatedAt: "desc" },
  });
  if (!current) throw new Error("No resumable subscription was found.");
  if (current.provider === "MANUAL") throw new Error("This recorded subscription cannot be resumed through a payment provider.");
  const provider = getPaymentProviderByName(current.provider);
  if (!provider.capabilities.supportsResume) throw new Error("This payment provider does not support resuming subscriptions.");
  const updated = await provider.resumeSubscription(current.providerSubscriptionId);
  return persistSubscription(prisma, provider.name, updated, {
    ownerType: current.ownerType,
    ownerId: current.ownerId,
    planId: current.planId,
    interval: current.interval,
    providerCustomerId: current.providerCustomerId,
  });
}

async function expireUnmanagedSubscriptions(ownerType: BillingOwnerType, ownerId: string) {
  const now = new Date();
  await prisma.subscription.updateMany({
    where: {
      ownerType,
      ownerId,
      provider: "MANUAL",
      status: {
        in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE],
      },
      currentPeriodEnd: { lte: now },
    },
    data: { status: SubscriptionStatus.CANCELED, endedAt: now, cancelAtPeriodEnd: false },
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
) {
  return client.subscription.upsert({
    where: { provider_providerSubscriptionId: { provider, providerSubscriptionId: value.id } },
    create: {
      ...owner,
      provider,
      providerSubscriptionId: value.id,
      status: statusMap[value.status],
      currentPeriodStart: value.currentPeriodStart,
      currentPeriodEnd: value.currentPeriodEnd,
      nextBillingDate: value.nextBillingDate,
      cancelAtPeriodEnd: value.cancelAtPeriodEnd,
      canceledAt: value.canceledAt,
      endedAt: value.endedAt,
    },
    update: {
      planId: owner.planId,
      interval: owner.interval,
      status: statusMap[value.status],
      currentPeriodStart: value.currentPeriodStart,
      currentPeriodEnd: value.currentPeriodEnd,
      nextBillingDate: value.nextBillingDate,
      cancelAtPeriodEnd: value.cancelAtPeriodEnd,
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
      ...owner,
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
  const subscription = value.subscriptionId
    ? await tx.subscription.findUnique({ where: { provider_providerSubscriptionId: { provider, providerSubscriptionId: value.subscriptionId } }, select: { id: true } })
    : null;
  const providerStatus = value.status === "succeeded" ? PaymentStatus.SUCCEEDED
    : value.status === "failed" ? PaymentStatus.FAILED
      : value.status === "refunded" ? PaymentStatus.REFUNDED
        : value.status === "partially_refunded" ? PaymentStatus.PARTIALLY_REFUNDED
        : PaymentStatus.PENDING;
  await tx.payment.upsert({
    where: { provider_providerPaymentId: { provider, providerPaymentId: value.id } },
    create: {
      ...owner,
      provider,
      providerPaymentId: value.id,
      subscriptionId: subscription?.id,
      amount: value.amount,
      currency: value.currency,
      status: providerStatus,
      description: value.description,
      paidAt: value.paidAt,
    },
    update: {
      subscriptionId: subscription?.id,
      amount: value.amount,
      currency: value.currency,
      status: providerStatus,
      description: value.description,
      paidAt: value.paidAt,
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
      const ownerType = metadata.ownerType === "ORGANIZATION" ? BillingOwnerType.ORGANIZATION
        : metadata.ownerType === "USER" ? BillingOwnerType.USER : null;
      const externalCustomerId = event.subscription?.customerId || event.invoice?.customerId || event.payment?.customerId;
      let billingCustomer = externalCustomerId
        ? await tx.billingCustomer.findFirst({ where: { provider, providerCustomerId: externalCustomerId } })
        : null;
      const checkoutAttempt = await tx.checkoutAttempt.findFirst({
        where: event.subscription
          ? {
              provider,
              OR: [
                { providerSubscriptionId: event.subscription.id },
                ...(event.checkoutId ? [{ providerCheckoutId: event.checkoutId }] : []),
                { providerCheckoutId: event.subscription.id },
              ],
            }
          : { provider, providerCheckoutId: event.id },
      });
      const owner = billingCustomer
        ? { ownerType: billingCustomer.ownerType, ownerId: billingCustomer.ownerId }
        : checkoutAttempt
          ? { ownerType: checkoutAttempt.ownerType, ownerId: checkoutAttempt.ownerId }
          : null;

      if (owner && checkoutAttempt && (owner.ownerType !== checkoutAttempt.ownerType || owner.ownerId !== checkoutAttempt.ownerId)) {
        throw new Error("Provider customer and checkout attempt map to different billing owners.");
      }
      if (owner && ownerType && metadata.ownerId && (owner.ownerType !== ownerType || owner.ownerId !== metadata.ownerId)) {
        throw new Error("Provider subscription metadata does not match its stored billing owner.");
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
                email: initiatingUser?.email ?? "billing@unavailable.invalid",
              },
              update: { providerCustomerId: event.subscription.customerId },
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
      if (!eventOwner && event.payment?.customerId) {
        const customer = await tx.billingCustomer.findFirst({ where: { provider, providerCustomerId: event.payment.customerId } });
        if (customer) eventOwner = { ownerType: customer.ownerType, ownerId: customer.ownerId };
      }
      const relatedSubscriptionId = event.payment?.subscriptionId ?? event.invoice?.subscriptionId;
      if (!eventOwner && relatedSubscriptionId) {
        const subscription = await tx.subscription.findUnique({
          where: { provider_providerSubscriptionId: { provider, providerSubscriptionId: relatedSubscriptionId } },
          select: { ownerType: true, ownerId: true },
        });
        if (subscription) eventOwner = { ownerType: subscription.ownerType, ownerId: subscription.ownerId };
      }
      if (eventOwner && event.invoice) {
        await persistInvoice(tx, provider, event.invoice, eventOwner);
      }
      if (eventOwner && event.payment) await persistPayment(tx, provider, event.payment, eventOwner);

      await tx.paymentEvent.update({ where: { id: stored.id }, data: { processedAt: new Date(), attempts: { increment: 1 }, lastError: null } });
      if (checkoutAttempt) await tx.checkoutAttempt.update({ where: { id: checkoutAttempt.id }, data: { status: "processed" } });
    });
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
  const provider = getPaymentProviderByName("RAZORPAY");
  if (!(await provider.verifyCheckout(parsed))) throw new Error("Razorpay checkout signature verification failed.");
  const attempt = await prisma.checkoutAttempt.findFirst({
    where: {
      provider: "RAZORPAY",
      providerSubscriptionId: parsed.subscriptionId,
      ownerType: parsed.ownerType,
      ownerId: parsed.ownerId,
    },
  });
  if (!attempt) throw new Error("The checkout does not belong to this account.");
  const remote = await provider.retrieveSubscription(parsed.subscriptionId);
  const payment = await provider.retrievePayment(parsed.paymentId);
  if (payment.status !== "succeeded" || payment.subscriptionId !== parsed.subscriptionId) {
    throw new Error("Razorpay has not confirmed a payment for this subscription.");
  }
  await persistSubscription(prisma, "RAZORPAY", remote, {
    ownerType: attempt.ownerType,
    ownerId: attempt.ownerId,
    planId: attempt.planId,
    interval: attempt.interval,
    providerCustomerId: remote.customerId || attempt.providerCustomerId,
  });
  if (remote.customerId) {
    await prisma.billingCustomer.update({
      where: { ownerType_ownerId_provider: { ownerType: attempt.ownerType, ownerId: attempt.ownerId, provider: "RAZORPAY" } },
      data: { providerCustomerId: remote.customerId },
    });
  }
  const subscription = await prisma.subscription.findUnique({
    where: { provider_providerSubscriptionId: { provider: "RAZORPAY", providerSubscriptionId: parsed.subscriptionId } },
    select: { id: true },
  });
  await prisma.payment.upsert({
    where: { provider_providerPaymentId: { provider: "RAZORPAY", providerPaymentId: parsed.paymentId } },
    create: {
      ownerType: attempt.ownerType,
      ownerId: attempt.ownerId,
      provider: "RAZORPAY",
      providerPaymentId: parsed.paymentId,
      subscriptionId: subscription?.id,
      amount: payment.amount,
      currency: payment.currency,
      status: PaymentStatus.SUCCEEDED,
      description: payment.description,
      paidAt: payment.paidAt,
    },
    update: {},
  });
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
  const provider = getPaymentProviderByName(providerName);
  const paymentMethodsPromise = provider.capabilities.supportsPaymentMethodManagement
    ? provider.listPaymentMethods(customer.providerCustomerId)
    : Promise.resolve([]);
  const [invoices, payments, paymentMethods] = await Promise.all([
    provider.listInvoices(customer.providerCustomerId),
    provider.listPayments(customer.providerCustomerId),
    paymentMethodsPromise,
  ]);
  await prisma.$transaction(async (tx) => {
    for (const invoice of invoices) await persistInvoice(tx, providerName, invoice, owner);
    for (const payment of payments) await persistPayment(tx, providerName, payment, owner);
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
