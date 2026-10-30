"use client";

import { useAuth } from "@clerk/nextjs";
import {
  SubscriptionDetailsButton,
  useSubscription,
} from "@clerk/nextjs/experimental";
import { useUpgradeDialog } from "./UpgradeDialog";

function PlanButton() {
  const { orgId, has } = useAuth();
  const payerType = orgId ? "organization" : "user";
  const { data: subscription } = useSubscription({ for: payerType });
  const openUpgradeDialog = useUpgradeDialog();

  const paidPlan = subscription?.subscriptionItems.find(
    (item) => item.status === "active" && !item.plan.isDefault,
  )?.plan;

  const isPaid = Boolean(paidPlan);

  const canManage =
    isPaid && (!orgId || has?.({ permission: "org:sys_billing:manage" }));

  const PlanButton = (
    <button
      className="flex h-full items-center px-3 font-medium text-foreground transition-colors hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50"
      type="button"
      onClick={isPaid ? undefined : () => openUpgradeDialog()}
    >
      {paidPlan?.name ?? "Free"}
    </button>
  );

  return (
    <div className="flex h-8 items-center overflow-hidden rounded-full border ☐ border-white/10 bg-white/3 text-xs">
      {canManage ? (
        <SubscriptionDetailsButton>{PlanButton}</SubscriptionDetailsButton>
      ) : (
        PlanButton
      )}

      {!isPaid && (
        <button
          type="button"
          onClick={() => openUpgradeDialog()}
          className="h-full border ☐ border-white/10 px-3 font-medium text-primary transition-colors
    hover:bg-primary/10"
        >
          Upgrade
        </button>
      )}
    </div>
  );
}

export default PlanButton;
