import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import {
  ProviderFeatureUnsupportedError,
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
  type ProviderWebhookEvent,
  type StartCheckoutInput,
  type VerifyCheckoutInput,
} from "@/lib/payments/types";

type RzSubscription = {
  id: string;
  plan_id: string;
  status: string;
  customer_id: string | null;
  current_start?: number | null;
  current_end?: number | null;
  charge_at: number;
  has_scheduled_changes: boolean;
  ended_at?: number | null;
  notes?: Record<string, string | number>;
  total_count: number;
  paid_count: number;
};
type RzPayment = {
  id: string;
  customer_id: string | null;
  subscription_id?: string | null;
  amount: number;
  currency: string;
  status: string;
  description?: string | null;
  created_at: number;
  amount_refunded?: number;
  refund_status?: string;
};
type RzInvoice = {
  id: string;
  customer_id?: string | null;
  subscription_id?: string;
  amount?: number;
  amount_paid?: number;
  amount_due?: number;
  currency?: string;
  status?: string;
  short_url?: string | null;
  pdf_url?: string | null;
  date?: number | null;
  expire_by?: number | null;
  paid_at?: number | null;
};

function asNotes(value: Record<string, unknown> | undefined) {
  return Object.fromEntries(
    Object.entries(value ?? {}).map(([key, item]) => [key, String(item)]),
  );
}

function mapSubscription(subscription: RzSubscription): ProviderSubscription {
  const status: ProviderSubscription["status"] =
    subscription.status === "active" ? "active"
      : subscription.status === "halted" ? "past_due"
        : subscription.status === "cancelled" ? "canceled"
          : subscription.status === "completed" || subscription.status === "expired"
            ? "canceled"
            : subscription.status === "pending" || subscription.status === "authenticated"
              ? "incomplete"
              : "incomplete";
  return {
    id: subscription.id,
    providerPlanId: subscription.plan_id,
    customerId: subscription.customer_id ?? "",
    status,
    currentPeriodStart: toProviderDate(subscription.current_start),
    currentPeriodEnd: toProviderDate(subscription.current_end),
    nextBillingDate: toProviderDate(subscription.charge_at),
    cancelAtPeriodEnd: subscription.has_scheduled_changes,
    canceledAt: subscription.status === "cancelled" ? toProviderDate(subscription.ended_at) : null,
    endedAt: toProviderDate(subscription.ended_at),
    metadata: asNotes(subscription.notes),
  };
}

function mapPayment(payment: RzPayment): ProviderPayment {
  return {
    id: payment.id,
    customerId: payment.customer_id ?? "",
    subscriptionId: payment.subscription_id ?? null,
    amount: payment.amount,
    currency: payment.currency.toUpperCase(),
    status: payment.refund_status === "partial" ? "partially_refunded"
      : payment.status === "refunded" || payment.refund_status === "full" ? "refunded"
      : payment.status === "captured" ? "succeeded"
      : payment.status === "failed" ? "failed"
        : "pending",
    description: payment.description ?? null,
    paidAt: payment.status === "captured" ? toProviderDate(payment.created_at) : null,
  };
}

function mapInvoice(invoice: RzInvoice): ProviderInvoice {
  const subscriptionId = (invoice as RzInvoice & { subscription_id?: string }).subscription_id;
  return {
    id: invoice.id,
    customerId: invoice.customer_id ?? "",
    subscriptionId: subscriptionId ?? null,
    amountDue: Number(invoice.amount_due ?? invoice.amount ?? 0),
    amountPaid: Number(invoice.amount_paid ?? 0),
    currency: (invoice.currency ?? "INR").toUpperCase(),
    status: invoice.status ?? "issued",
    hostedUrl: invoice.short_url ?? null,
    pdfUrl: (invoice as RzInvoice & { pdf_url?: string }).pdf_url ?? null,
    periodStart: toProviderDate(invoice.date),
    periodEnd: toProviderDate(invoice.expire_by),
    paidAt: invoice.status === "paid" ? toProviderDate(invoice.paid_at) : null,
  };
}

function secureEqualHex(expected: string, actual: string) {
  if (!/^[\da-f]+$/i.test(actual) || expected.length !== actual.length) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}

export class RazorpayAdapter implements PaymentProvider {
  readonly name = "RAZORPAY" as const;
  readonly capabilities: ProviderCapabilities = {
    supportsPaymentMethodManagement: false,
    supportsCoupons: false,
    supportsResume: true,
    supportsRefunds: true,
  };

  private readonly razorpay: Razorpay;
  private readonly keyId: string;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required for Razorpay billing.");
    this.keyId = keyId;
    this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async createCustomer(input: CreateCustomerInput): Promise<ProviderCustomer> {
    const customer = await this.razorpay.customers.create({
      name: input.name,
      email: input.email,
      notes: input.metadata,
    });
    return { id: customer.id };
  }

  async createCheckout(input: StartCheckoutInput) {
    if (!input.totalBillingCycles || input.totalBillingCycles < 1) {
      throw new Error("Configure a finite Razorpay billing cycle count for this plan and interval.");
    }
    if (input.couponCode) throw new ProviderFeatureUnsupportedError("coupons", this.name);
    const subscription = await this.razorpay.subscriptions.create({
      plan_id: input.providerPlanId,
      total_count: input.totalBillingCycles,
      customer_notify: 1,
      notes: input.metadata,
      notify_info: { notify_email: input.customerEmail },
    }) as unknown as RzSubscription;
    return {
      provider: "RAZORPAY" as const,
      kind: "razorpay-subscription" as const,
      checkoutId: subscription.id,
      subscriptionId: subscription.id,
      publicKey: this.keyId,
      name: input.planName,
      description: `Helfer ${input.interval.toLowerCase()} subscription`,
      email: input.customerEmail,
    };
  }

  async createSubscription(input: StartCheckoutInput) {
    if (!input.totalBillingCycles || input.totalBillingCycles < 1) {
      throw new Error("Configure a finite Razorpay billing cycle count for this plan and interval.");
    }
    const subscription = await this.razorpay.subscriptions.create({
      plan_id: input.providerPlanId,
      total_count: input.totalBillingCycles,
      customer_notify: 1,
      notes: input.metadata,
      notify_info: { notify_email: input.customerEmail },
    }) as unknown as RzSubscription;
    return mapSubscription(subscription);
  }

  async retrieveSubscription(id: string) {
    return mapSubscription(await this.razorpay.subscriptions.fetch(id) as unknown as RzSubscription);
  }

  async updateSubscription(id: string, providerPlanId: string, _interval: BillingCycle, totalBillingCycles?: number) {
    const current = await this.razorpay.subscriptions.fetch(id) as unknown as RzSubscription;
    const updated = await this.razorpay.subscriptions.update(id, {
      plan_id: providerPlanId,
      remaining_count: totalBillingCycles ?? Math.max(current.total_count - current.paid_count, 1),
      schedule_change_at: "now",
    }) as unknown as RzSubscription;
    return { ...mapSubscription(updated), cancelAtPeriodEnd: false };
  }

  async cancelSubscription(id: string, atPeriodEnd: boolean) {
    const subscription = await this.razorpay.subscriptions.cancel(id, atPeriodEnd) as unknown as RzSubscription;
    return { ...mapSubscription(subscription), cancelAtPeriodEnd: atPeriodEnd };
  }

  async resumeSubscription(id: string) {
    const current = await this.razorpay.subscriptions.fetch(id) as unknown as RzSubscription;
    if (current.has_scheduled_changes) {
      return mapSubscription(await this.razorpay.subscriptions.cancelScheduledChanges(id) as unknown as RzSubscription);
    }
    return mapSubscription(await this.razorpay.subscriptions.resume(id, { resume_at: "now" }) as unknown as RzSubscription);
  }

  async createPaymentMethodManagementSession(): Promise<string> {
    throw new ProviderFeatureUnsupportedError("payment method management portal", this.name);
  }

  async listInvoices(customerId: string) {
    const result = await this.razorpay.invoices.all({ customer_id: customerId, count: 100 });
    return result.items.map((invoice) => mapInvoice(invoice as unknown as RzInvoice));
  }

  async listPayments(customerId: string) {
    const result = await this.razorpay.payments.all({ count: 100 }) as unknown as { items: RzPayment[] };
    return result.items.filter((payment) => payment.customer_id === customerId).map(mapPayment);
  }

  async retrievePayment(id: string) {
    return mapPayment(await this.razorpay.payments.fetch(id) as unknown as RzPayment);
  }

  async listPaymentMethods(): Promise<ProviderPaymentMethod[]> {
    throw new ProviderFeatureUnsupportedError("saved payment method listing", this.name);
  }

  async refund(paymentId: string, amount?: number) {
    const refund = await this.razorpay.payments.refund(paymentId, amount ? { amount } : {});
    return { id: refund.id, status: refund.status ?? "processed" };
  }

  async verifyWebhook(rawBody: string, signature: string): Promise<ProviderWebhookEvent> {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("RAZORPAY_WEBHOOK_SECRET is required to verify Razorpay webhooks.");
    const expected = createHmac("sha256", webhookSecret).update(rawBody, "utf8").digest("hex");
    if (!secureEqualHex(expected, signature)) throw new Error("Invalid Razorpay webhook signature.");

    const payload = JSON.parse(rawBody) as {
      id?: string;
      event?: string;
      created_at?: number;
      payload?: {
        subscription?: { entity?: RzSubscription };
        payment?: { entity?: RzPayment };
        invoice?: { entity?: RzInvoice };
      };
    };
    const normalizedId = payload.id || createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    return {
      id: normalizedId,
      type: payload.event ?? "unknown",
      ...(payload.payload?.subscription?.entity
        ? { subscription: mapSubscription(payload.payload.subscription.entity as unknown as RzSubscription) }
        : {}),
      ...(payload.payload?.payment?.entity
        ? { payment: mapPayment(payload.payload.payment.entity as unknown as RzPayment) }
        : {}),
      ...(payload.payload?.invoice?.entity
        ? { invoice: mapInvoice(payload.payload.invoice.entity as unknown as RzInvoice) }
        : {}),
    };
  }

  async verifyCheckout(input: VerifyCheckoutInput) {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new Error("RAZORPAY_KEY_SECRET is required to verify checkout.");
    const expected = createHmac("sha256", secret)
      .update(`${input.paymentId}|${input.subscriptionId}`, "utf8")
      .digest("hex");
    return secureEqualHex(expected, input.signature);
  }
}
