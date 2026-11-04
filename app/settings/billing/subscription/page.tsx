import Link from "next/link";
import { SubscriptionControls } from "@/components/billing/SubscriptionControls";
import { canManageBilling } from "@/lib/auth/permissions";
import { getBillingOverview, listSubscriptionPlans } from "@/lib/payments/service";
import { getCurrentBillingOwner } from "@/app/settings/billing/_owner";

export const instant = false;

export default async function SubscriptionPage() {
  const owner = await getCurrentBillingOwner();
  const [overview, plans] = await Promise.all([
    getBillingOverview({ ownerType: owner.ownerType, ownerId: owner.ownerId }),
    listSubscriptionPlans(),
  ]);
  const current = overview.subscription;
  return (
    <div className="space-y-6">
      <Link href="/settings/billing" className="text-sm text-muted-foreground hover:text-foreground">← Billing overview</Link>
      <header><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Subscription</p><h2 className="mt-2 text-2xl font-semibold">Subscription settings</h2><p className="mt-2 text-sm text-muted-foreground">{current ? `${current.plan.name} · ${current.status.toLowerCase()}` : "Your account is on the Free plan."}</p></header>
      {current ? (
        <section className="rounded-2xl border bg-card p-6">
          <div className="mb-6 grid gap-4 sm:grid-cols-3"><Info label="Plan" value={current.plan.name} /><Info label="Status" value={current.status.toLowerCase().replaceAll("_", " ")} /><Info label="Next billing date" value={current.nextBillingDate?.toLocaleDateString() ?? "Not scheduled"} /></div>
          {current.provider === "MANUAL" ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
              <p className="font-medium">This subscription is recorded for plan access.</p>
              <p className="mt-2 text-muted-foreground">It is not connected to a supported payment provider. Plan access continues through {current.currentPeriodEnd?.toLocaleDateString() ?? "the end of the current billing period"}. Start a new plan here when you are ready to subscribe through the configured provider.</p>
            </div>
          ) : (
            <SubscriptionControls ownerType={owner.ownerType} ownerId={owner.ownerId} currentStatus={current.status} cancelAtPeriodEnd={current.cancelAtPeriodEnd} currentPlanId={current.planId} currentInterval={current.interval} plans={plans.map(({ id, name }) => ({ id, name }))} checkoutEnabled={plans.some((plan) => plan.checkout.monthly || plan.checkout.yearly)} supportsPaymentMethodManagement={current.provider === "STRIPE"} canManage={owner.ownerType === "USER" || canManageBilling(owner.role)} />
          )}
        </section>
      ) : <section className="rounded-2xl border bg-card p-6"><p className="text-muted-foreground">There is no paid subscription for {owner.name} yet.</p><Link href="/pricing" className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Compare plans</Link></section>}
      <p className="text-xs text-muted-foreground">Plan changes and cancellations are confirmed by the payment provider. The local status follows signed provider events.</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 capitalize">{value}</p></div>; }
