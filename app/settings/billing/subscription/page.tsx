import Link from "next/link";
import type { ReactNode } from "react";
import { SubscriptionControls } from "@/components/billing/SubscriptionControls";
import { SubscriptionStatusBadge } from "@/components/billing/SubscriptionStatusBadge";
import { canManageBilling } from "@/lib/auth/permissions";
import {
  hasPaidAccess,
  isPausedStatus,
  subscriptionStatusPresentation,
} from "@/lib/payments/subscription-status";
import {
  getBillingOverview,
  listSubscriptionPlans,
} from "@/lib/payments/service";
import { getCurrentBillingOwner } from "@/app/settings/billing/_owner";

export const instant = false;

function formatDate(date: Date | null | undefined) {
  if (!date) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export default async function SubscriptionPage() {
  const owner = await getCurrentBillingOwner();
  const [overview, plans] = await Promise.all([
    getBillingOverview({ ownerType: owner.ownerType, ownerId: owner.ownerId }),
    listSubscriptionPlans(),
  ]);
  const subscription = overview.subscription;
  const hasAccess = hasPaidAccess(subscription?.status);
  const paused = isPausedStatus(subscription?.status);
  const canManage = owner.ownerType === "USER" || canManageBilling(owner.role);
  const manualActive = subscription?.provider === "MANUAL" && (hasAccess || paused);

  const freePlan = plans.find((plan) => plan.monthlyPrice === 0 && plan.yearlyPrice === 0) ?? null;
  const activePlan = (hasAccess || paused) && subscription
    ? plans.find((plan) => plan.id === subscription.planId) ?? subscription.plan
    : freePlan;
  const currentPlanId = activePlan?.id ?? "free";
  const currentPlanName = activePlan?.name ?? "Free";
  const currentInterval = subscription?.interval ?? "MONTHLY";
  const cancelAtPeriodEnd = Boolean(subscription?.cancelAtPeriodEnd);

  const nextBilling = subscription?.nextBillingDate ?? subscription?.currentPeriodEnd ?? null;
  const accessUntil = subscription
    ? subscription.status === "CANCELED" || subscription.status === "INCOMPLETE_EXPIRED"
      ? subscription.endedAt ?? subscription.currentPeriodEnd ?? subscription.nextBillingDate ?? null
      : subscription.currentPeriodEnd ?? subscription.nextBillingDate ?? subscription.endedAt ?? null
    : null;
  const nextBillingDateLabel = formatDate(nextBilling);
  const accessUntilLabel = formatDate(accessUntil);
  const renewalAmount = hasAccess && activePlan
    ? currentInterval === "YEARLY" ? activePlan.yearlyPrice : activePlan.monthlyPrice
    : null;
  const renewalAmountLabel = renewalAmount !== null && activePlan
    ? formatMoney(renewalAmount, activePlan.currency)
    : null;

  const status = subscriptionStatusPresentation(subscription?.status, {
    endedAt: subscription?.endedAt,
    currentPeriodEnd: subscription?.currentPeriodEnd,
  });
  const billingIntervalValue = hasAccess || paused
    ? currentInterval === "MONTHLY" ? "Monthly" : "Yearly"
    : "—";
  const automaticRenewalValue = hasAccess ? (cancelAtPeriodEnd ? "Off" : "On") : paused ? "Paused" : "—";
  const nextDateLabel = hasAccess && cancelAtPeriodEnd ? "Access until" : "Next billing date";
  const nextDateValue = hasAccess
    ? cancelAtPeriodEnd
      ? accessUntilLabel ?? "Not available"
      : nextBillingDateLabel ?? "Not scheduled"
    : paused
      ? "Not scheduled"
      : "No upcoming charge";
  const nextPaymentValue = hasAccess
    ? cancelAtPeriodEnd ? "None" : renewalAmountLabel ?? "Not available"
    : paused ? "Paused" : "—";
  const canResumeRenewal = overview.capabilities?.supportsRenewalResume ?? false;
  const planChangeDisabledReason = manualActive
    ? "This subscription is recorded manually and cannot be changed through a payment provider."
    : paused
      ? "Resume this paused subscription before changing plans."
      : null;

  return (
    <div className="space-y-6">
      <Link
        href="/settings/billing"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Billing overview
      </Link>
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
          Subscription · {owner.name}
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Subscription settings</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your plan, billing interval, and automatic renewal.
        </p>
      </header>

      {subscription && (subscription.status === "PAST_DUE" || subscription.status === "UNPAID") && (
        <Callout tone="danger" title={subscription.status === "UNPAID" ? "Payment is outstanding" : "Payment failed"}>
          {subscription.status === "UNPAID"
            ? "Paid access is suspended until the outstanding payment is resolved. Update your payment method or choose a plan below to start a new subscription."
            : "Your latest payment failed. Update your payment method to avoid losing access to your paid plan."}
        </Callout>
      )}
      {subscription && subscription.status === "INCOMPLETE" && (
        <Callout tone="warning" title="Subscription pending">
          This subscription is waiting for payment confirmation. Choose a plan below to start a secure checkout.
        </Callout>
      )}
      {paused && (
        <Callout tone="warning" title="Subscription paused">
          Billing is paused and paid access is on hold. Resume the subscription below to continue billing and restore access.
        </Callout>
      )}
      {subscription && !hasAccess && !paused && (subscription.status === "CANCELED" || subscription.status === "INCOMPLETE_EXPIRED") && (
        <Callout tone="neutral" title="Subscription ended">
          This subscription has ended and the account is on the Free plan. Choose a plan below to subscribe again.
        </Callout>
      )}
      {subscription && hasAccess && cancelAtPeriodEnd && (
        <Callout tone="warning" title="Automatic renewal is off">
          Your {currentPlanName} plan stays active until {accessUntilLabel ?? "the end of the current billing period"}. You will not be charged again, and the account moves to Free after that date.{" "}
          {canResumeRenewal
            ? "Resume automatic renewal below if you want to continue."
            : "This cancellation cannot be undone with the current payment provider, but you can start a new plan after the current period ends."}
        </Callout>
      )}
      {subscription && hasAccess && !cancelAtPeriodEnd && subscription.status === "TRIALING" && (
        <Callout tone="info" title="Trial active">
          Your trial is active. Your first payment of {renewalAmountLabel ?? "the plan price"} is scheduled for {nextBillingDateLabel ?? "the end of the trial"}.
        </Callout>
      )}

      <section className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Current plan</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-semibold">{currentPlanName}</h3>
              <SubscriptionStatusBadge
                status={subscription?.status}
                endedAt={subscription?.endedAt}
                currentPeriodEnd={subscription?.currentPeriodEnd}
              />
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{status.description}</p>
          </div>
          {hasAccess && activePlan && renewalAmount !== null && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {currentInterval === "MONTHLY" ? "Monthly" : "Yearly"} price
              </p>
              <p className="mt-1 text-xl font-semibold">{renewalAmountLabel}</p>
              <p className="text-xs text-muted-foreground">
                per {currentInterval === "MONTHLY" ? "month" : "year"}
              </p>
            </div>
          )}
        </div>
        <dl className="mt-6 grid gap-4 border-t pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Billing interval" value={billingIntervalValue} />
          <Info label="Automatic renewal" value={automaticRenewalValue} />
          <Info label={nextDateLabel} value={nextDateValue} />
          <Info label="Upcoming renewal" value={nextPaymentValue} />
        </dl>
        {manualActive && (
          <p className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
            This subscription is recorded for plan access and is not connected to a supported payment provider.
            Plan access continues through {accessUntilLabel ?? "the end of the current period"}. Start a new plan
            when it ends.
          </p>
        )}
      </section>

      <SubscriptionControls
        ownerType={owner.ownerType}
        ownerId={owner.ownerId}
        canManage={canManage}
        currentPlanId={currentPlanId}
        currentPlanName={currentPlanName}
        currentInterval={currentInterval}
        cancelAtPeriodEnd={cancelAtPeriodEnd}
        hasActiveAccess={hasAccess}
        isPaused={paused}
        manualActive={manualActive}
        nextBillingDateLabel={nextBillingDateLabel}
        accessUntilLabel={accessUntilLabel}
        renewalAmountLabel={renewalAmountLabel}
        capabilities={overview.capabilities}
        plans={plans}
        disabledReason={planChangeDisabledReason}
      />

      <p className="text-xs text-muted-foreground">
        Plan changes, cancellations, and renewals are confirmed by the payment provider. The local
        status follows signed provider events and may take a moment to update.
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 capitalize">{value}</p>
    </div>
  );
}

function Callout({
  tone,
  title,
  children,
}: {
  tone: "warning" | "danger" | "info" | "neutral";
  title: string;
  children: ReactNode;
}) {
  const toneClass = {
    warning: "border-amber-500/30 bg-amber-500/5",
    danger: "border-destructive/30 bg-destructive/5",
    info: "border-sky-500/30 bg-sky-500/5",
    neutral: "border-border bg-muted/30",
  }[tone];
  return (
    <section className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </section>
  );
}
