"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type RazorpayPayment = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

type Interval = "MONTHLY" | "YEARLY";

export type SubscriptionPlanOption = {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPromptLimit: number;
  workspaceLimit: number | null;
  unlimitedWorkspaces: boolean;
  publicSharing: boolean;
  pdfExport: boolean;
  sortOrder: number;
  checkout: { monthly: boolean; yearly: boolean };
};

type BillingResponse = {
  error?: string;
  url?: string;
  provider?: "STRIPE" | "RAZORPAY";
  kind?: "redirect" | "razorpay-subscription";
  subscriptionId?: string;
  publicKey?: string;
  name?: string;
  description?: string;
  email?: string;
};

type Confirmation = {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  variant?: "default" | "destructive";
  closeBeforeRun?: boolean;
  run: () => Promise<boolean>;
};

type Capabilities = {
  supportsResume: boolean;
  supportsRenewalResume: boolean;
  supportsPaymentMethodManagement: boolean;
} | null;

function formatPrice(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function intervalName(interval: Interval) {
  return interval === "MONTHLY" ? "Monthly" : "Yearly";
}

function intervalUnit(interval: Interval) {
  return interval === "MONTHLY" ? "month" : "year";
}

function isFreePlan(plan: SubscriptionPlanOption) {
  return plan.monthlyPrice === 0 && plan.yearlyPrice === 0;
}

async function postJson<T>(url: string, body: unknown): Promise<T & { error?: string }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Billing request failed.");
  return data;
}

export function SubscriptionControls({
  ownerType,
  ownerId,
  canManage,
  currentPlanId,
  currentPlanName,
  currentInterval = "MONTHLY",
  cancelAtPeriodEnd = false,
  hasActiveAccess,
  isPaused,
  manualActive,
  nextBillingDateLabel,
  accessUntilLabel,
  renewalAmountLabel,
  capabilities,
  plans,
  disabledReason,
}: {
  ownerType: "USER" | "ORGANIZATION";
  ownerId: string;
  canManage: boolean;
  currentPlanId: string;
  currentPlanName?: string | null;
  currentInterval?: Interval;
  cancelAtPeriodEnd?: boolean;
  hasActiveAccess: boolean;
  isPaused: boolean;
  manualActive: boolean;
  nextBillingDateLabel: string | null;
  accessUntilLabel: string | null;
  renewalAmountLabel: string | null;
  capabilities: Capabilities;
  plans: SubscriptionPlanOption[];
  disabledReason?: string | null;
}) {
  const router = useRouter();
  const [interval, setInterval] = useState<Interval>(currentInterval);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const currentPlan = plans.find((plan) => plan.id === currentPlanId);
  const activeIsFree = !currentPlan || isFreePlan(currentPlan);
  const planChangeBlocked = !canManage || manualActive || isPaused || Boolean(disabledReason);
  const planDisabledReason = !canManage
    ? "Ask an organization owner or admin to change billing settings."
    : disabledReason ?? null;

  function launchRazorpay(data: BillingResponse, successMessage: string) {
    return new Promise<boolean>((resolve, reject) => {
      if (!data.subscriptionId || !data.publicKey) {
        reject(new Error("Payment provider returned an incomplete checkout response."));
        return;
      }
      if (!window.Razorpay) {
        reject(new Error("Razorpay Checkout did not load. Refresh and try again."));
        return;
      }
      try {
        const checkout = new window.Razorpay({
          key: data.publicKey,
          subscription_id: data.subscriptionId,
          name: data.name,
          description: data.description,
          prefill: { email: data.email },
          handler: async (payment: RazorpayPayment) => {
            try {
              await postJson("/api/billing/razorpay/verify", {
                ownerType,
                ownerId,
                paymentId: payment.razorpay_payment_id,
                subscriptionId: payment.razorpay_subscription_id,
                signature: payment.razorpay_signature,
              });
              toast.success(successMessage);
              router.refresh();
              resolve(true);
            } catch (cause) {
              reject(cause);
            }
          },
          modal: { ondismiss: () => resolve(false) },
        });
        checkout.open();
      } catch (cause) {
        reject(cause);
      }
    });
  }

  async function act(key: string, url: string, body: Record<string, unknown>, successMessage: string) {
    setPending(key);
    setError("");
    try {
      const data = await postJson<BillingResponse>(url, body);
      if (data.provider === "RAZORPAY" && data.kind === "razorpay-subscription") {
        return await launchRazorpay(data, successMessage);
      }
      if (data.url) {
        window.location.assign(data.url);
        return true;
      }
      toast.success(successMessage);
      router.refresh();
      return true;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Billing action failed.";
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setPending("");
    }
  }

  async function runConfirmation() {
    if (!confirmation || pending) return;
    const active = confirmation;
    if (active.closeBeforeRun) setConfirmation(null);
    const succeeded = await active.run();
    if (succeeded) setConfirmation(null);
  }

  function planAction(plan: SubscriptionPlanOption) {
    const free = isFreePlan(plan);
    const targetIsCurrent = plan.id === currentPlanId && (free || interval === currentInterval);
    if (targetIsCurrent) {
      return { label: "Current plan", disabled: true, current: true };
    }
    if (free && cancelAtPeriodEnd && plan.id !== currentPlanId) {
      return { label: "Starts after current period", disabled: true, current: false };
    }
    const checkoutReady = free || plan.checkout[interval === "MONTHLY" ? "monthly" : "yearly"];
    if (!checkoutReady) {
      return { label: "Billing setup required", disabled: true, current: false };
    }
    let label: string;
    if (plan.id === currentPlanId) {
      label = interval === "MONTHLY" ? "Switch to Monthly" : "Switch to Yearly";
    } else if (free) {
      label = "Downgrade to Free";
    } else if (activeIsFree) {
      label = `Upgrade to ${plan.name}`;
    } else if ((currentPlan?.sortOrder ?? 0) < plan.sortOrder) {
      label = `Upgrade to ${plan.name}`;
    } else {
      label = `Downgrade to ${plan.name}`;
    }
    return { label, disabled: planChangeBlocked, current: false };
  }

  function openPlanConfirmation(plan: SubscriptionPlanOption) {
    if (planChangeBlocked || pending) return;
    setError("");
    const action = planAction(plan);
    if (action.disabled && !action.current) return;
    const free = isFreePlan(plan);
    const amount = interval === "MONTHLY" ? plan.monthlyPrice : plan.yearlyPrice;
    const price = free
      ? "Free"
      : `${formatPrice(amount, plan.currency)} / ${intervalUnit(interval)}`;
    // Providers that cannot undo a scheduled cancellation cannot update the
    // ending subscription either, so the change needs a fresh authorization.
    const scheduledAndUnrecoverable =
      cancelAtPeriodEnd && capabilities?.supportsRenewalResume === false;
    const usesCheckout =
      !free && ((!hasActiveAccess && !isPaused) || scheduledAndUnrecoverable);
    const actionKey = `plan-${plan.id}-${interval}`;
    const description = free
      ? `Automatic renewal will be turned off. Your ${currentPlanName ?? "current"} plan stays active until ${accessUntilLabel ?? "the end of the current billing period"}, then your account moves to Free.`
      : usesCheckout
        ? `You will start a secure checkout for ${plan.name} (${intervalName(interval)}) at ${price}. Your plan activates after the payment provider confirms payment.`
        : `Your plan will change to ${plan.name} (${intervalName(interval)}) at ${price}. Any proration is handled by the payment provider.`;

    setConfirmation({
      title: action.label,
      description,
      confirmLabel: action.label,
      pendingLabel: "Updating plan…",
      variant: free ? "destructive" : "default",
      closeBeforeRun: true,
      run: () => act(
        actionKey,
        usesCheckout ? "/api/billing/checkout" : "/api/billing/subscriptions",
        usesCheckout
          ? { ownerType, ownerId, planId: plan.id, interval }
          : { action: "change-plan", ownerType, ownerId, planId: plan.id, interval },
        free
          ? "Automatic renewal turned off. Your plan stays active until the end of the current period."
          : usesCheckout
            ? "Subscription activated."
            : "Subscription updated.",
      ),
    });
  }

  function confirmCancelRenewal() {
    if (!canManage || pending) return;
    setError("");
    setConfirmation({
      title: "Cancel automatic renewal?",
      description: `Your ${currentPlanName ?? "current"} plan will stay active until ${accessUntilLabel ?? "the end of the current billing period"}. You will not be charged again.${
        capabilities?.supportsRenewalResume
          ? " You can resume automatic renewal before then if you change your mind."
          : " This cancellation cannot be undone with this payment provider, but you can start a new plan after the current period ends."
      }`,
      confirmLabel: "Cancel automatic renewal",
      pendingLabel: "Turning off renewal…",
      variant: "destructive",
      run: () => act(
        "cancel-renewal",
        "/api/billing/subscriptions",
        { action: "cancel", atPeriodEnd: true, ownerType, ownerId },
        "Automatic renewal turned off.",
      ),
    });
  }

  function confirmResumeRenewal() {
    if (!canManage || pending) return;
    setError("");
    setConfirmation({
      title: "Resume automatic renewal?",
      description: `Automatic renewal will restart. Your next payment of ${renewalAmountLabel ?? "your plan price"} is scheduled for ${nextBillingDateLabel ?? "the next billing date"}.`,
      confirmLabel: "Resume automatic renewal",
      pendingLabel: "Resuming renewal…",
      run: () => act(
        "resume-renewal",
        "/api/billing/subscriptions",
        { action: "resume", ownerType, ownerId },
        "Automatic renewal turned back on.",
      ),
    });
  }

  function confirmResumePaused() {
    if (!canManage || pending) return;
    setError("");
    setConfirmation({
      title: "Resume subscription?",
      description: "Billing will restart and access to your paid plan will be restored. The payment provider schedules the next payment.",
      confirmLabel: "Resume subscription",
      pendingLabel: "Resuming subscription…",
      run: () => act(
        "resume-paused",
        "/api/billing/subscriptions",
        { action: "resume", ownerType, ownerId },
        "Subscription resumed.",
      ),
    });
  }

  function confirmCancelImmediately() {
    if (!canManage || pending) return;
    setError("");
    setConfirmation({
      title: "End subscription immediately?",
      description: `This is different from cancelling automatic renewal. Your subscription ends now instead of ${accessUntilLabel ?? "at the end of the paid period"}. You will lose paid access immediately and remaining time is not refunded.`,
      confirmLabel: "End subscription now",
      pendingLabel: "Cancelling subscription…",
      variant: "destructive",
      run: () => act(
        "cancel-immediately",
        "/api/billing/subscriptions",
        { action: "cancel", atPeriodEnd: false, ownerType, ownerId },
        "Subscription cancelled.",
      ),
    });
  }

  function managePaymentMethod() {
    if (!canManage || pending) return;
    void act(
      "payment-method",
      "/api/billing/subscriptions",
      { action: "payment-method", ownerType, ownerId },
      "Opening payment method management.",
    );
  }

  return (
    <div className="space-y-6">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onError={() => {
          setError("Razorpay Checkout could not load.");
          toast.error("Razorpay Checkout could not load.");
        }}
      />
      {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <section className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Plans</p>
            <h3 className="mt-1 text-lg font-semibold">Choose your plan</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Prices are billed {intervalName(interval).toLowerCase()}. The payment provider confirms every change.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-xl border bg-muted/30 p-1">
            {(["MONTHLY", "YEARLY"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={interval === value}
                disabled={Boolean(pending)}
                onClick={() => setInterval(value)}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50",
                  interval === value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {intervalName(value)}
              </button>
            ))}
          </div>
        </div>

        {planDisabledReason && (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">
            {planDisabledReason}
          </p>
        )}

        {plans.length === 0 ? (
          <p className="mt-5 rounded-xl border bg-muted/20 p-5 text-sm text-muted-foreground">
            No subscription plans are published yet.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => {
              const free = isFreePlan(plan);
              const amount = interval === "MONTHLY" ? plan.monthlyPrice : plan.yearlyPrice;
              const action = planAction(plan);
              const current = action.current;
              const actionPending = pending === `plan-${plan.id}-${interval}`;
              return (
                <article
                  key={plan.id}
                  className={cn(
                    "flex flex-col rounded-2xl border bg-card p-5",
                    current && "border-primary ring-1 ring-primary/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-lg font-semibold">{plan.name}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {plan.description ?? "A plan for focused, collaborative work."}
                      </p>
                    </div>
                    {current && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-2xl font-semibold">
                      {free ? "Free" : formatPrice(amount, plan.currency)}
                    </span>
                    {!free && <span className="text-sm text-muted-foreground">/ {intervalUnit(interval)}</span>}
                  </div>
                  <ul className="my-5 flex-1 space-y-2 text-sm">
                    <PlanFeature>{plan.monthlyPromptLimit.toLocaleString()} AI prompts per month</PlanFeature>
                    <PlanFeature>{plan.unlimitedWorkspaces ? "Unlimited workspaces" : `${plan.workspaceLimit ?? 0} workspaces`}</PlanFeature>
                    <PlanFeature enabled={plan.publicSharing}>Public sharing</PlanFeature>
                    <PlanFeature enabled={plan.pdfExport}>PDF export</PlanFeature>
                  </ul>
                  <Button
                    variant={action.label.startsWith("Upgrade") ? "default" : "outline"}
                    disabled={action.disabled || Boolean(pending)}
                    onClick={() => openPlanConfirmation(plan)}
                  >
                    {actionPending ? "Updating…" : action.label}
                  </Button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {(hasActiveAccess || isPaused) && !manualActive && (
        <section className="rounded-2xl border bg-card p-6">
          {isPaused ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Subscription</p>
                  <h3 className="mt-1 text-lg font-semibold">Subscription paused</h3>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    Billing is paused and access to {currentPlanName ?? "your paid plan"} is on hold. Resume your subscription to continue billing and restore access.
                  </p>
                </div>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">Paused</Badge>
              </div>
              <div className="mt-5">
                {!canManage ? (
                  <p className="text-sm text-muted-foreground">Ask an organization owner or admin to resume billing.</p>
                ) : capabilities?.supportsResume ? (
                  <Button disabled={Boolean(pending)} onClick={confirmResumePaused}>
                    {pending === "resume-paused" ? "Resuming…" : "Resume subscription"}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">This payment provider does not support resuming subscriptions here.</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Automatic renewal</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{cancelAtPeriodEnd ? "Renewal is off" : "Renewal is on"}</h3>
                    <Badge
                      variant={cancelAtPeriodEnd ? "outline" : "secondary"}
                      className={cancelAtPeriodEnd ? "" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"}
                    >
                      {cancelAtPeriodEnd ? "Off" : "On"}
                    </Badge>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    {cancelAtPeriodEnd
                      ? `Your ${currentPlanName ?? "current"} plan stays active until ${accessUntilLabel ?? "the end of the paid period"}. You will not be charged again.`
                      : `Your next payment of ${renewalAmountLabel ?? "your plan price"} is scheduled for ${nextBillingDateLabel ?? "the next billing date"}.`}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-3">
                <Info label="Next billing date" value={cancelAtPeriodEnd ? "No future charge" : nextBillingDateLabel ?? "Not scheduled"} />
                <Info label="Access until" value={accessUntilLabel ?? "Not available"} />
                <Info label="Upcoming renewal" value={cancelAtPeriodEnd ? "None" : renewalAmountLabel ?? "Not available"} />
              </div>

              {!canManage ? (
                <p className="mt-5 text-sm text-muted-foreground">Ask an organization owner or admin to manage automatic renewal.</p>
              ) : (
                <>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {cancelAtPeriodEnd ? (
                      capabilities?.supportsRenewalResume ? (
                        <Button disabled={Boolean(pending)} onClick={confirmResumeRenewal}>
                          {pending === "resume-renewal" ? "Resuming…" : "Resume automatic renewal"}
                        </Button>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          This payment provider cannot undo a scheduled cancellation. You can subscribe again after the current period ends.
                        </p>
                      )
                    ) : (
                      <Button variant="outline" disabled={Boolean(pending)} onClick={confirmCancelRenewal}>
                        {pending === "cancel-renewal" ? "Turning off…" : "Cancel automatic renewal"}
                      </Button>
                    )}
                    {capabilities?.supportsPaymentMethodManagement && (
                      <Button variant="outline" disabled={Boolean(pending)} onClick={managePaymentMethod}>
                        {pending === "payment-method" ? "Opening…" : "Manage payment method"}
                      </Button>
                    )}
                  </div>

                  <div className="mt-6 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                    <p className="text-sm font-medium">End subscription immediately</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This is different from cancelling automatic renewal: your paid access ends now and remaining time is not refunded.
                    </p>
                    <Button variant="destructive" size="sm" className="mt-3" disabled={Boolean(pending)} onClick={confirmCancelImmediately}>
                      {pending === "cancel-immediately" ? "Cancelling…" : "Cancel subscription immediately"}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      )}

      <AlertDialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirmation(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmation?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(pending)}>Keep current settings</AlertDialogCancel>
            <Button
              variant={confirmation?.variant ?? "default"}
              disabled={Boolean(pending)}
              onClick={() => void runConfirmation()}
            >
              {pending ? confirmation?.pendingLabel : confirmation?.confirmLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PlanFeature({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  return (
    <li className={cn("flex items-start gap-2", !enabled && "text-muted-foreground")}>
      <Check className={cn("mt-0.5 size-4 shrink-0", enabled ? "text-primary" : "opacity-30")} />
      {children}
    </li>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
