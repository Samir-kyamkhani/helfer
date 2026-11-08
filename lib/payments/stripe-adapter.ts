import Stripe from "stripe";
import {
  toProviderDate,
  type BillingCycle,
  type CreateCustomerInput,
  type PaymentProvider,
  type ProviderCapabilities,
  type ProviderCustomer,
  type ProviderInvoice,
  type ProviderPayment,
  type ProviderPaymentMethod,
  type ProviderSubscription,
  type ProviderSubscriptionStatus,
  type ProviderWebhookEvent,
  type StartCheckoutInput,
} from "@/lib/payments/types";

function stripeStatus(status: Stripe.Subscription.Status): ProviderSubscriptionStatus {
  switch (status) {
    case "active": return "active";
    case "trialing": return "trialing";
    case "past_due": return "past_due";
    case "unpaid": return "unpaid";
    case "canceled": return "canceled";
    case "incomplete_expired": return "incomplete_expired";
    case "paused": return "paused";
    default: return "incomplete";
  }
}

function stringId(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? "";
}

function mapSubscription(subscription: Stripe.Subscription): ProviderSubscription {
  const item = subscription.items.data[0];
  return {
    id: subscription.id,
    providerPlanId: item?.price.id,
    customerId: stringId(subscription.customer),
    status: stripeStatus(subscription.status),
    currentPeriodStart: toProviderDate(item?.current_period_start),
    currentPeriodEnd: toProviderDate(item?.current_period_end),
    nextBillingDate: toProviderDate(item?.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: toProviderDate(subscription.canceled_at),
    endedAt: toProviderDate(subscription.ended_at),
    metadata: { ...subscription.metadata },
  };
}

function mapInvoice(invoice: Stripe.Invoice): ProviderInvoice {
  const invoiceWithSub = invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
  return {
    id: invoice.id,
    customerId: stringId(invoice.customer),
    subscriptionId: stringId(invoiceWithSub.subscription) || null,
    amountDue: invoice.amount_due,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency.toUpperCase(),
    status: invoice.status ?? "draft",
    hostedUrl: invoice.hosted_invoice_url ?? null,
    pdfUrl: invoice.invoice_pdf ?? null,
    periodStart: toProviderDate(invoice.period_start),
    periodEnd: toProviderDate(invoice.period_end),
    paidAt: invoice.status_transitions.paid_at
      ? toProviderDate(invoice.status_transitions.paid_at)
      : null,
  };
}

function mapPayment(payment: Stripe.PaymentIntent, refundStatus?: "refunded" | "partially_refunded"): ProviderPayment {
  return {
    id: payment.id,
    customerId: stringId(payment.customer),
    subscriptionId: null,
    amount: payment.amount_received || payment.amount,
    currency: payment.currency.toUpperCase(),
    status: refundStatus ?? (payment.status === "succeeded"
      ? "succeeded"
      : payment.status === "canceled"
        ? "failed"
        : payment.status === "requires_payment_method"
          ? "failed"
          : "pending"),
    description: payment.description,
    paidAt: payment.status === "succeeded" ? toProviderDate(payment.created) : null,
  };
}

export class StripeAdapter implements PaymentProvider {
  readonly name = "STRIPE" as const;
  readonly capabilities: ProviderCapabilities = {
    supportsPaymentMethodManagement: true,
    supportsCoupons: true,
    supportsResume: true,
    supportsRenewalResume: true,
    supportsRefunds: true,
  };

  private readonly stripe: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error("STRIPE_SECRET_KEY is required for Stripe billing.");
    this.stripe = new Stripe(secretKey);
  }

  async createCustomer(input: CreateCustomerInput): Promise<ProviderCustomer> {
    const customer = await this.stripe.customers.create({
      email: input.email,
      name: input.name,
      metadata: input.metadata,
    });
    return { id: customer.id };
  }

  async createCheckout(input: StartCheckoutInput) {
    const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
    if (input.couponCode) {
      const promotions = await this.stripe.promotionCodes.list({
        code: input.couponCode.trim(),
        active: true,
        limit: 1,
      });
      const promotion = promotions.data[0];
      if (!promotion) throw new Error("This coupon code is invalid or expired.");
      discounts.push({ promotion_code: promotion.id });
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: input.customerId,
      line_items: [{ price: input.providerPlanId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: input.metadata,
      subscription_data: { metadata: input.metadata },
      ...(discounts.length > 0 ? { discounts } : { allow_promotion_codes: true }),
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return {
      provider: "STRIPE" as const,
      kind: "redirect" as const,
      checkoutId: session.id,
      url: session.url,
    };
  }

  async createSubscription(input: StartCheckoutInput) {
    const subscription = await this.stripe.subscriptions.create({
      customer: input.customerId,
      items: [{ price: input.providerPlanId }],
      metadata: input.metadata,
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.confirmation_secret"],
    });
    return mapSubscription(subscription);
  }

  async retrieveSubscription(id: string) {
    return mapSubscription(await this.stripe.subscriptions.retrieve(id));
  }

  async updateSubscription(id: string, providerPlanId: string, _interval: BillingCycle, _totalBillingCycles?: number, metadata?: Record<string, string>) {
    const existing = await this.stripe.subscriptions.retrieve(id);
    const item = existing.items.data[0];
    if (!item) throw new Error("Stripe subscription has no billable item.");
    return mapSubscription(await this.stripe.subscriptions.update(id, {
      items: [{ id: item.id, price: providerPlanId }],
      proration_behavior: "create_prorations",
      ...(metadata ? { metadata: { ...existing.metadata, ...metadata } } : {}),
    }));
  }

  async cancelSubscription(id: string, atPeriodEnd: boolean) {
    if (atPeriodEnd) {
      return mapSubscription(await this.stripe.subscriptions.update(id, {
        cancel_at_period_end: true,
      }));
    }
    return mapSubscription(await this.stripe.subscriptions.cancel(id));
  }

  async resumeSubscription(id: string) {
    const subscription = await this.stripe.subscriptions.retrieve(id);
    if (subscription.status === "paused") {
      return mapSubscription(await this.stripe.subscriptions.resume(id, {
        billing_cycle_anchor: { type: "unchanged" },
      }));
    }
    if (subscription.cancel_at_period_end) {
      return mapSubscription(await this.stripe.subscriptions.update(id, {
        cancel_at_period_end: false,
      }));
    }
    return mapSubscription(subscription);
  }

  async createPaymentMethodManagementSession(customerId: string, returnUrl: string) {
    const portal = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return portal.url;
  }

  async listInvoices(customerId: string) {
    const result = await this.stripe.invoices.list({ customer: customerId, limit: 100 });
    return result.data.map(mapInvoice);
  }

  async listPayments(customerId: string) {
    const result = await this.stripe.paymentIntents.list({ customer: customerId, limit: 100 });
    return result.data.map((payment) => mapPayment(payment));
  }

  async retrievePayment(id: string) {
    return mapPayment(await this.stripe.paymentIntents.retrieve(id));
  }

  async listPaymentMethods(customerId: string): Promise<ProviderPaymentMethod[]> {
    const [methods, customer] = await Promise.all([
      this.stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 100 }),
      this.stripe.customers.retrieve(customerId),
    ]);
    const defaultMethod = !customer.deleted ? customer.invoice_settings.default_payment_method : null;
    const defaultId = typeof defaultMethod === "string"
      ? defaultMethod
      : defaultMethod && typeof defaultMethod === "object" ? defaultMethod.id : undefined;
    return methods.data.map((method) => ({
      id: method.id,
      type: method.type,
      brand: method.card?.brand ?? null,
      last4: method.card?.last4 ?? null,
      expiryMonth: method.card?.exp_month ?? null,
      expiryYear: method.card?.exp_year ?? null,
      isDefault: method.id === defaultId,
    }));
  }

  async refund(paymentId: string, amount?: number) {
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentId,
      ...(amount ? { amount } : {}),
    });
    return { id: refund.id, status: refund.status ?? "pending" };
  }

  async verifyWebhook(rawBody: string, signature: string): Promise<ProviderWebhookEvent> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is required to verify Stripe webhooks.");
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type.startsWith("customer.subscription.")) {
      return {
        id: event.id,
        type: event.type,
        subscription: mapSubscription(event.data.object as Stripe.Subscription),
      };
    }

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = stringId(session.subscription);
      return {
        id: event.id,
        type: event.type,
        checkoutId: session.id,
        ...(subscriptionId
          ? { subscription: mapSubscription(await this.stripe.subscriptions.retrieve(subscriptionId)) }
          : {}),
      };
    }

    if (event.type.startsWith("invoice.")) {
      return {
        id: event.id,
        type: event.type,
        invoice: mapInvoice(event.data.object as Stripe.Invoice),
      };
    }

    if (event.type === "payment_intent.succeeded" || event.type === "payment_intent.payment_failed") {
      return {
        id: event.id,
        type: event.type,
        payment: mapPayment(event.data.object as Stripe.PaymentIntent),
      };
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = stringId(charge.payment_intent);
      if (paymentIntentId) {
        return {
          id: event.id,
          type: event.type,
          payment: mapPayment(
            await this.stripe.paymentIntents.retrieve(paymentIntentId),
            charge.amount_refunded >= charge.amount ? "refunded" : "partially_refunded",
          ),
        };
      }
    }

    return { id: event.id, type: event.type };
  }

  async verifyCheckout() {
    return false;
  }
}
