import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/billing/CheckoutForm";
import { getActiveOrganization } from "@/lib/auth/organization";
import { requireCurrentSession } from "@/lib/auth/session";
import { listSubscriptionPlans } from "@/lib/payments/service";

export const instant = false;

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ planId?: string; interval?: string }> }) {
  const [session, activeOrganization, plans, params] = await Promise.all([
    requireCurrentSession(), getActiveOrganization(), listSubscriptionPlans(), searchParams,
  ]);
  const plan = plans.find((item) => item.id === params.planId);
  if (!plan || (plan.monthlyPrice === 0 && plan.yearlyPrice === 0)) notFound();
  const interval = params.interval === "YEARLY" ? "YEARLY" : "MONTHLY";
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8">
      <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">← Plans</Link>
      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_0.9fr]">
        <section>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Secure checkout</p>
          <h1 className="mt-3 text-3xl font-semibold">Subscribe to {plan.name}</h1>
          <p className="mt-3 text-muted-foreground">Your subscription belongs to {activeOrganization ? `the ${activeOrganization.name} organization` : "your personal account"}. Provider confirmation updates access automatically.</p>
          <div className="mt-8 rounded-2xl border bg-card p-6">
            <h2 className="font-semibold">{plan.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{plan.description ?? "Paid Helfer plan"}</p>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li>{plan.monthlyPromptLimit.toLocaleString()} AI prompts per month</li>
              <li>{plan.unlimitedWorkspaces ? "Unlimited workspaces" : `${plan.workspaceLimit ?? 0} workspaces`}</li>
              <li>{plan.publicSharing ? "Public sharing included" : "Private sharing"}</li>
              <li>{plan.pdfExport ? "PDF export included" : "No PDF export"}</li>
            </ul>
          </div>
        </section>
        <section className="h-fit rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Billing details</h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">Signed in as {session.user.email}</p>
          <CheckoutForm
            planId={plan.id}
            ownerType={activeOrganization ? "ORGANIZATION" : "USER"}
            ownerId={activeOrganization?.id ?? session.user.id}
            email={session.user.email}
            monthlyPrice={plan.monthlyPrice}
            yearlyPrice={plan.yearlyPrice}
            currency={plan.currency}
            defaultInterval={interval}
            checkoutEnabled={plan.checkout[interval === "MONTHLY" ? "monthly" : "yearly"]}
          />
        </section>
      </div>
    </main>
  );
}
