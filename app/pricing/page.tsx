import Link from "next/link";
import { connection } from "next/server";
import { PricingPlans } from "@/components/billing/PricingPlans";
import { listSubscriptionPlans } from "@/lib/payments/service";

export default async function PricingPage() {
  await connection();
  const plans = await listSubscriptionPlans();
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Helfer home</Link>
      <header className="mx-auto mb-10 mt-8 max-w-2xl text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Plans</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Choose the workspace that fits</h1>
        <p className="mt-4 text-muted-foreground">Compare usage, collaboration, and export features. You can change a paid plan from billing settings.</p>
      </header>
      <PricingPlans plans={plans} />
      <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">Plan prices and provider products are managed in the billing catalog. Paid checkout appears after the provider keys and product IDs are configured.</p>
    </main>
  );
}
