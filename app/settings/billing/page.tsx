import Link from "next/link";
import { getBillingOverview } from "@/lib/payments/service";
import { getCurrentBillingOwner } from "@/app/settings/billing/_owner";
import { PaymentMethodButton } from "@/components/billing/PaymentMethodButton";

export const instant = false;

export default async function BillingPage() {
  const owner = await getCurrentBillingOwner();
  const overview = await getBillingOverview({ ownerType: owner.ownerType, ownerId: owner.ownerId });
  const subscription = overview.subscription;
  return (
    <div className="space-y-6">
      <header><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Billing · {owner.name}</p><h2 className="mt-2 text-2xl font-semibold">Billing overview</h2><p className="mt-2 text-sm text-muted-foreground">Manage the subscription and payment history for this account.</p></header>
      <section className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-sm text-muted-foreground">Current plan</p><h3 className="mt-1 text-xl font-semibold">{subscription?.plan.name ?? "Free"}</h3><p className="mt-2 text-sm text-muted-foreground">Status: <span className="font-medium text-foreground">{subscription?.status ?? "No paid subscription"}</span></p></div>
          <Link href="/settings/billing/subscription" className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Manage subscription</Link>
        </div>
        {subscription && <div className="mt-6 grid gap-4 border-t pt-5 sm:grid-cols-3"><Info label="Billing interval" value={subscription.interval.toLowerCase()} /><Info label="Next billing date" value={subscription.nextBillingDate?.toLocaleDateString() ?? "Not scheduled"} /><Info label="Renewal" value={subscription.cancelAtPeriodEnd ? "Canceled at period end" : "Renews automatically"} /></div>}
      </section>
      <section className="rounded-2xl border bg-card p-6">
        <h3 className="text-lg font-semibold">Payment method</h3><p className="mt-1 mb-4 text-sm text-muted-foreground">Payment details are stored with the payment provider.</p>
        {overview.paymentMethods.length > 0 && <ul className="mb-4 space-y-2">{overview.paymentMethods.map((method) => <li key={method.id} className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm"><span className="capitalize">{method.brand ?? method.type} {method.last4 ? `ending in ${method.last4}` : ""}</span><span className="text-xs text-muted-foreground">{method.isDefault ? "Default · " : ""}{method.expiryMonth && method.expiryYear ? `Expires ${String(method.expiryMonth).padStart(2, "0")}/${method.expiryYear}` : ""}</span></li>)}</ul>}
        <PaymentMethodButton ownerType={owner.ownerType} ownerId={owner.ownerId} enabled={overview.provider === "STRIPE"} />
        {overview.provider === "RAZORPAY" && <p className="mt-3 text-sm text-muted-foreground">Razorpay payment methods are managed during subscription checkout. A separate customer portal is not supported by this provider.</p>}
      </section>
      <section className="grid gap-4 sm:grid-cols-2"><BillingLink href="/settings/billing/invoices" title="Invoices" detail="View and download billing documents." /><BillingLink href="/pricing" title="Plans" detail="Compare the available plans and billing intervals." /></section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 capitalize">{value}</p></div>; }
function BillingLink({ href, title, detail }: { href: string; title: string; detail: string }) { return <Link href={href} className="rounded-2xl border bg-card p-5 transition-colors hover:bg-muted/40"><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{detail}</p></Link>; }
