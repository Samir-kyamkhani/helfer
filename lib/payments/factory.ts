import { RazorpayAdapter } from "@/lib/payments/razorpay-adapter";
import { StripeAdapter } from "@/lib/payments/stripe-adapter";
import type { PaymentProvider, PaymentProviderName } from "@/lib/payments/types";

export function getPaymentProvider(
  providerName = process.env.PAYMENT_PROVIDER?.toUpperCase(),
): PaymentProvider {
  if (providerName === "STRIPE") return new StripeAdapter();
  if (providerName === "RAZORPAY") return new RazorpayAdapter();
  throw new Error("Set PAYMENT_PROVIDER to STRIPE or RAZORPAY.");
}

export function getPaymentProviderByName(providerName: PaymentProviderName) {
  return getPaymentProvider(providerName);
}
