"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SubscriptionControls({
  ownerType,
  ownerId,
  currentStatus,
  cancelAtPeriodEnd = false,
  currentPlanId,
  currentInterval = "MONTHLY",
  plans,
  checkoutEnabled,
  supportsPaymentMethodManagement,
  canManage,
}: {
  ownerType: "USER" | "ORGANIZATION";
  ownerId: string;
  currentStatus?: string;
  cancelAtPeriodEnd?: boolean;
  currentPlanId?: string;
  currentInterval?: "MONTHLY" | "YEARLY";
  plans: { id: string; name: string }[];
  checkoutEnabled: boolean;
  supportsPaymentMethodManagement: boolean;
  canManage: boolean;
}) {
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function act(action: string, extra: Record<string, string | boolean> = {}) {
    setPending(action); setError(""); setMessage("");
    try {
      const response = await fetch("/api/billing/subscriptions", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ownerType, ownerId, ...extra }),
      });
      const data = await response.json() as { error?: string; url?: string };
      if (!response.ok) throw new Error(data.error || "Billing action failed.");
      if (data.url) window.location.assign(data.url);
      else { setMessage("Subscription updated. This page will refresh."); window.location.reload(); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Billing action failed."); }
    finally { setPending(""); }
  }

  if (!canManage) return <p className="text-sm text-muted-foreground">Ask an organization owner or admin to change billing settings.</p>;

  return (
    <div className="space-y-5">
      {currentPlanId && <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 space-y-2 text-sm font-medium">Change plan
          <select id="planId" defaultValue={currentPlanId} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
            {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium">Interval
          <select id="interval" defaultValue={currentInterval} className="h-10 rounded-lg border bg-background px-3 text-sm"><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option></select>
        </label>
        <Button disabled={!!pending || !checkoutEnabled} onClick={() => {
          const planId = (document.getElementById("planId") as HTMLSelectElement).value;
          const interval = (document.getElementById("interval") as HTMLSelectElement).value;
          void act("change-plan", { planId, interval });
        }}>{pending === "change-plan" ? "Saving…" : "Update plan"}</Button>
      </div>}
      <div className="flex flex-wrap gap-2">
        {supportsPaymentMethodManagement && <Button variant="outline" disabled={!!pending || !checkoutEnabled} onClick={() => void act("payment-method")}>Manage payment method</Button>}
        {(currentStatus === "ACTIVE" || currentStatus === "TRIALING" || currentStatus === "PAST_DUE") && !cancelAtPeriodEnd && <Button variant="outline" disabled={!!pending} onClick={() => {
          if (window.confirm("Cancel this subscription at the end of the current billing period?")) void act("cancel", { atPeriodEnd: true });
        }}>{pending === "cancel" ? "Canceling…" : "Cancel subscription"}</Button>}
        {(currentStatus === "PAUSED" || (currentStatus === "ACTIVE" && cancelAtPeriodEnd)) && <Button variant="outline" disabled={!!pending} onClick={() => void act("resume")}>Reactivate subscription</Button>}
      </div>
      {cancelAtPeriodEnd && <p className="text-sm text-muted-foreground">This subscription remains active until the current billing period ends.</p>}
      {currentStatus === "CANCELED" && <p className="text-sm text-muted-foreground">This subscription has ended. Choose a paid plan from Pricing to subscribe again.</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
