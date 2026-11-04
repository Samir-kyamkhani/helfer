"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type Plan = {
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
  checkout: { monthly: boolean; yearly: boolean };
};

function price(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(value / 100);
}

export function PricingPlans({ plans }: { plans: Plan[] }) {
  const [interval, setInterval] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const paidPlans = plans.filter((plan) => plan.monthlyPrice > 0 || plan.yearlyPrice > 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center gap-1 rounded-xl border bg-muted/30 p-1 w-fit mx-auto">
        <button className={`rounded-lg px-4 py-2 text-sm ${interval === "MONTHLY" ? "bg-background shadow-sm" : "text-muted-foreground"}`} onClick={() => setInterval("MONTHLY")}>Monthly</button>
        <button className={`rounded-lg px-4 py-2 text-sm ${interval === "YEARLY" ? "bg-background shadow-sm" : "text-muted-foreground"}`} onClick={() => setInterval("YEARLY")}>Yearly</button>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">No subscription plans are published yet.</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const amount = interval === "MONTHLY" ? plan.monthlyPrice : plan.yearlyPrice;
            const free = plan.monthlyPrice === 0 && plan.yearlyPrice === 0;
            return (
              <article key={plan.id} className="flex flex-col rounded-2xl border bg-card p-6 shadow-sm">
                <div>
                  <h2 className="text-xl font-semibold">{plan.name}</h2>
                  <p className="mt-2 min-h-10 text-sm text-muted-foreground">{plan.description ?? "A plan for focused, collaborative work."}</p>
                  <div className="mt-5 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold">{free ? "Free" : price(amount, plan.currency)}</span>
                    {!free && <span className="text-sm text-muted-foreground">/ {interval.toLowerCase().replace("ly", "")}</span>}
                  </div>
                </div>
                <ul className="my-6 flex-1 space-y-3 text-sm">
                  <Feature>{plan.monthlyPromptLimit.toLocaleString()} AI prompts per month</Feature>
                  <Feature>{plan.unlimitedWorkspaces ? "Unlimited workspaces" : `${plan.workspaceLimit ?? 0} workspaces`}</Feature>
                  <Feature enabled={plan.publicSharing}>Public sharing</Feature>
                  <Feature enabled={plan.pdfExport}>PDF export</Feature>
                </ul>
                {free ? (
                  <Button variant="outline" asChild><Link href="/sign-up">Get started</Link></Button>
                ) : plan.checkout[interval === "MONTHLY" ? "monthly" : "yearly"] ? (
                  <Button asChild><Link href={`/checkout?planId=${encodeURIComponent(plan.id)}&interval=${interval}`}>Choose {plan.name}</Link></Button>
                ) : (
                  <Button disabled title="Configure the payment provider and this plan's provider price IDs first">Billing setup required</Button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {paidPlans.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b bg-muted/30"><tr><th className="p-4">Included</th>{plans.map((plan) => <th key={plan.id} className="p-4">{plan.name}</th>)}</tr></thead>
            <tbody>
              <ComparisonRow title="AI prompts / month" values={plans.map((plan) => plan.monthlyPromptLimit.toLocaleString())} />
              <ComparisonRow title="Workspaces" values={plans.map((plan) => plan.unlimitedWorkspaces ? "Unlimited" : String(plan.workspaceLimit ?? 0))} />
              <ComparisonRow title="Public sharing" values={plans.map((plan) => plan.publicSharing ? "Included" : "—")} />
              <ComparisonRow title="PDF export" values={plans.map((plan) => plan.pdfExport ? "Included" : "—")} />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Feature({ children, enabled = true }: { children: React.ReactNode; enabled?: boolean }) {
  return <li className={`flex items-center gap-2 ${enabled ? "" : "text-muted-foreground"}`}><Check className={`size-4 ${enabled ? "text-primary" : "opacity-30"}`} />{children}</li>;
}

function ComparisonRow({ title, values }: { title: string; values: string[] }) {
  return <tr className="border-b last:border-0"><th className="p-4 font-medium">{title}</th>{values.map((value, index) => <td key={`${title}-${index}`} className="p-4 text-muted-foreground">{value}</td>)}</tr>;
}
