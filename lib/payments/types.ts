export type PaymentProviderName = "STRIPE" | "RAZORPAY";
export type BillingOwnerKind = "USER" | "ORGANIZATION";
export type BillingCycle = "MONTHLY" | "YEARLY";

export type ProviderCapabilities = {
  supportsPaymentMethodManagement: boolean;
  supportsCoupons: boolean;
  supportsResume: boolean;
  /** Whether a scheduled end-of-period cancellation can be undone. */
  supportsRenewalResume: boolean;
  supportsRefunds: boolean;
};

export type CreateCustomerInput = {
  email: string;
  name: string;
  metadata: Record<string, string>;
};

export type ProviderCustomer = { id: string };

export type StartCheckoutInput = {
  customerId: string;
  customerEmail: string;
  customerName: string;
  planId: string;
  planName: string;
  providerPlanId: string;
  interval: BillingCycle;
  currency: string;
  amount: number;
  successUrl: string;
  cancelUrl: string;
  couponCode?: string;
  totalBillingCycles?: number;
  metadata: Record<string, string>;
};

export type CheckoutResult =
  | {
      provider: "STRIPE";
      kind: "redirect";
      checkoutId: string;
      url: string;
    }
  | {
      provider: "RAZORPAY";
      kind: "razorpay-subscription";
      checkoutId: string;
      subscriptionId: string;
      publicKey: string;
      name: string;
      description: string;
      email: string;
    };

export type ProviderSubscriptionStatus =
  | "incomplete"
  | "trialing"
  | "active"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete_expired"
  | "paused";

export type ProviderSubscription = {
  id: string;
  /** Provider-specific product/price ID used to reconcile plan changes from webhooks. */
  providerPlanId?: string;
  customerId: string;
  status: ProviderSubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  nextBillingDate: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  endedAt: Date | null;
  metadata: Record<string, string>;
};

export type ProviderInvoice = {
  id: string;
  customerId: string;
  subscriptionId: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string;
  hostedUrl: string | null;
  pdfUrl: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  paidAt: Date | null;
};

export type ProviderPayment = {
  id: string;
  customerId: string;
  subscriptionId?: string | null;
  invoiceId?: string | null;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded" | "partially_refunded";
  description: string | null;
  paidAt: Date | null;
};

export type ProviderPaymentMethod = {
  id: string;
  type: string;
  brand: string | null;
  last4: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
};

export type ProviderWebhookEvent = {
  id: string;
  type: string;
  checkoutId?: string;
  subscription?: ProviderSubscription & { planId?: string; interval?: BillingCycle };
  invoice?: ProviderInvoice;
  payment?: ProviderPayment;
};

export type VerifyCheckoutInput = {
  paymentId: string;
  subscriptionId: string;
  signature: string;
};

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  readonly capabilities: ProviderCapabilities;
  createCustomer(input: CreateCustomerInput): Promise<ProviderCustomer>;
  createCheckout(input: StartCheckoutInput): Promise<CheckoutResult>;
  createSubscription(input: StartCheckoutInput): Promise<ProviderSubscription>;
  retrieveSubscription(id: string): Promise<ProviderSubscription>;
  updateSubscription(
    id: string,
    providerPlanId: string,
    interval: BillingCycle,
    totalBillingCycles?: number,
    metadata?: Record<string, string>,
  ): Promise<ProviderSubscription>;
  cancelSubscription(id: string, atPeriodEnd: boolean): Promise<ProviderSubscription>;
  resumeSubscription(id: string): Promise<ProviderSubscription>;
  createPaymentMethodManagementSession(customerId: string, returnUrl: string): Promise<string>;
  listInvoices(customerId: string): Promise<ProviderInvoice[]>;
  listPayments(customerId: string): Promise<ProviderPayment[]>;
  retrievePayment(id: string): Promise<ProviderPayment>;
  listPaymentMethods(customerId: string): Promise<ProviderPaymentMethod[]>;
  refund(paymentId: string, amount?: number): Promise<{ id: string; status: string }>;
  verifyWebhook(rawBody: string, signature: string, eventId?: string): Promise<ProviderWebhookEvent>;
  verifyCheckout(input: VerifyCheckoutInput): Promise<boolean>;
}

export class ProviderFeatureUnsupportedError extends Error {
  constructor(feature: string, provider: PaymentProviderName) {
    super(`${feature} is not supported by ${provider.toLowerCase()}.`);
    this.name = "ProviderFeatureUnsupportedError";
  }
}

/**
 * Raised when a provider refuses to mutate an already-authorized mandate
 * (for example, Razorpay UPI/eMandate subscriptions). The only supported
 * recovery is a brand-new subscription checkout, which requires the
 * customer to authorize a fresh mandate.
 */
export class ProviderSubscriptionNotUpdatableError extends Error {
  constructor(
    provider: PaymentProviderName,
    readonly paymentMode: string,
  ) {
    super(
      `${provider.toLowerCase()} cannot change a subscription authorized with ${paymentMode.toUpperCase()}. A new subscription authorization is required.`,
    );
    this.name = "ProviderSubscriptionNotUpdatableError";
  }
}

export function toProviderDate(timestamp: number | null | undefined) {
  return timestamp ? new Date(timestamp * 1000) : null;
}
