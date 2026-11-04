import Link from "next/link";
import { requireCurrentSession } from "@/lib/auth/session";

export const instant = false;

export default async function CheckoutSuccessPage() {
  await requireCurrentSession();
  return (
    <main className="mx-auto max-w-xl px-5 py-24 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-700">✓</div>
      <h1 className="mt-6 text-3xl font-semibold">Payment submitted</h1>
      <p className="mt-3 text-muted-foreground">The payment provider is confirming the subscription. Billing settings will show the final status as soon as its signed event arrives.</p>
      <div className="mt-8 flex justify-center gap-3"><Link className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground" href="/settings/billing">View billing</Link><Link className="rounded-lg border px-4 py-2 text-sm" href="/dashboard">Go to workspace</Link></div>
    </main>
  );
}
