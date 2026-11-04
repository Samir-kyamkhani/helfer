"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void }; }
}

type CheckoutResult =
  | { provider: "STRIPE"; kind: "redirect"; url: string }
  | { provider: "RAZORPAY"; kind: "razorpay-subscription"; subscriptionId: string; publicKey: string; name: string; description: string; email: string };

export function CheckoutForm({
  planId,
  ownerType,
  ownerId,
  email,
  monthlyPrice,
  yearlyPrice,
  currency,
  defaultInterval = "MONTHLY",
  checkoutEnabled,
}: {
  planId: string;
  ownerType: "USER" | "ORGANIZATION";
  ownerId: string;
  email: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  defaultInterval?: "MONTHLY" | "YEARLY";
  checkoutEnabled: boolean;
}) {
  const router = useRouter();
  const [interval, setInterval] = useState(defaultInterval);
  const [couponCode, setCouponCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadingScript, setLoadingScript] = useState(false);
  const amount = interval === "MONTHLY" ? monthlyPrice : yearlyPrice;
  const formattedAmount = new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount / 100);

  async function beginCheckout() {
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ownerType, ownerId, planId, interval, couponCode: couponCode.trim() || undefined }),
      });
      const data = await response.json() as CheckoutResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not start checkout.");
      if (data.provider === "STRIPE" && data.kind === "redirect") {
        window.location.assign(data.url);
        return;
      }
      if (data.provider !== "RAZORPAY" || data.kind !== "razorpay-subscription") throw new Error("Payment provider returned an unexpected checkout response.");
      if (!window.Razorpay) throw new Error("Razorpay Checkout did not load. Refresh and try again.");
      const checkout = new window.Razorpay({
        key: data.publicKey,
        subscription_id: data.subscriptionId,
        name: data.name,
        description: data.description,
        prefill: { email: data.email || email },
        handler: async (payment: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => {
          const verify = await fetch("/api/billing/razorpay/verify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              ownerType,
              ownerId,
              paymentId: payment.razorpay_payment_id,
              subscriptionId: payment.razorpay_subscription_id,
              signature: payment.razorpay_signature,
            }),
          });
          const verification = await verify.json() as { error?: string };
          if (!verify.ok) {
            setError(verification.error || "Payment confirmation failed.");
            setBusy(false);
            return;
          }
          router.push("/checkout/success?provider=razorpay");
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      checkout.open();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start checkout.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" onLoad={() => setLoadingScript(false)} onReady={() => setLoadingScript(false)} onError={() => { setLoadingScript(false); setError("Razorpay Checkout could not load."); }} />
      <div>
        <p className="mb-2 text-sm font-medium">Billing interval</p>
        <div className="grid grid-cols-2 gap-2">
          {(["MONTHLY", "YEARLY"] as const).map((value) => <button key={value} type="button" onClick={() => setInterval(value)} className={`rounded-xl border px-4 py-3 text-sm ${interval === value ? "border-primary bg-primary/5" : "bg-background"}`}>{value === "MONTHLY" ? "Monthly" : "Yearly"}</button>)}
        </div>
      </div>
      <div className="flex items-baseline justify-between rounded-xl bg-muted/40 p-4"><span className="text-sm text-muted-foreground">{interval === "MONTHLY" ? "Monthly total" : "Yearly total"}</span><span className="text-xl font-semibold">{formattedAmount}</span></div>
      <label className="block space-y-2 text-sm font-medium" htmlFor="coupon">Coupon code <span className="font-normal text-muted-foreground">(optional)</span>
        <input id="coupon" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} className="h-10 w-full rounded-lg border bg-background px-3 font-normal" autoComplete="off" />
      </label>
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {!checkoutEnabled && <p className="text-sm text-muted-foreground">Checkout is not enabled. Add the payment provider credentials and this plan’s price IDs to the server configuration.</p>}
      <Button className="w-full" disabled={!checkoutEnabled || busy || loadingScript} onClick={beginCheckout}>
        {busy ? "Preparing secure checkout…" : loadingScript ? "Loading payment options…" : "Continue to secure checkout"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Your subscription status updates from verified payment-provider events.</p>
    </div>
  );
}
