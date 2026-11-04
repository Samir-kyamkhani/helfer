import Link from "next/link";
import { requireCurrentSession } from "@/lib/auth/session";

export const instant = false;

export default async function CheckoutCancelPage() {
  await requireCurrentSession();
  return (
    <main className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="text-3xl font-semibold">Checkout was canceled</h1>
      <p className="mt-3 text-muted-foreground">No subscription change was confirmed. You can return to plans or review your billing settings.</p>
      <div className="mt-8 flex justify-center gap-3"><Link className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground" href="/pricing">View plans</Link><Link className="rounded-lg border px-4 py-2 text-sm" href="/settings/billing">Billing settings</Link></div>
    </main>
  );
}
