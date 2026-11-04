"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PaymentMethodButton({ ownerType, ownerId, enabled }: { ownerType: "USER" | "ORGANIZATION"; ownerId: string; enabled: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function open() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/billing/subscriptions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "payment-method", ownerType, ownerId }) });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Could not open payment method settings.");
      window.location.assign(result.url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not open payment method settings."); setBusy(false); }
  }
  return <div className="space-y-2"><Button variant="outline" onClick={open} disabled={!enabled || busy}>{busy ? "Opening…" : "Manage payment methods"}</Button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}
