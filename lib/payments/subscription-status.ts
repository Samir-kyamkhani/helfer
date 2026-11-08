export type SubscriptionStatusTone = "success" | "info" | "warning" | "danger" | "neutral";

export type SubscriptionStatusPresentation = {
  label: string;
  tone: SubscriptionStatusTone;
  description: string;
};

const paidAccessStatuses = new Set(["ACTIVE", "TRIALING", "PAST_DUE"]);

export function hasPaidAccess(status: string | null | undefined) {
  return Boolean(status && paidAccessStatuses.has(status));
}

export function isPausedStatus(status: string | null | undefined) {
  return status === "PAUSED";
}

export function subscriptionStatusPresentation(
  status: string | null | undefined,
  options: { endedAt?: Date | null; currentPeriodEnd?: Date | null; now?: Date } = {},
): SubscriptionStatusPresentation {
  const now = options.now ?? new Date();
  switch (status) {
    case "ACTIVE":
      return {
        label: "Active",
        tone: "success",
        description: "Your subscription is active.",
      };
    case "TRIALING":
      return {
        label: "Trialing",
        tone: "info",
        description: "Your trial is active.",
      };
    case "PAST_DUE":
      return {
        label: "Past due",
        tone: "warning",
        description: "The latest payment failed. Update your payment method to avoid interruption.",
      };
    case "UNPAID":
      return {
        label: "Unpaid",
        tone: "danger",
        description: "Payment is outstanding and paid access is suspended.",
      };
    case "PAUSED":
      return {
        label: "Paused",
        tone: "warning",
        description: "Billing is paused and paid access is on hold.",
      };
    case "INCOMPLETE":
      return {
        label: "Pending",
        tone: "warning",
        description: "This subscription is waiting for payment confirmation.",
      };
    case "INCOMPLETE_EXPIRED":
      return {
        label: "Expired",
        tone: "danger",
        description: "This subscription expired before it was activated.",
      };
    case "CANCELED": {
      const end = options.endedAt ?? options.currentPeriodEnd ?? null;
      if (end && end.getTime() <= now.getTime()) {
        return {
          label: "Expired",
          tone: "danger",
          description: "This subscription has ended.",
        };
      }
      return {
        label: "Cancelled",
        tone: "neutral",
        description: "This subscription has been cancelled.",
      };
    }
    default:
      return {
        label: "Free",
        tone: "neutral",
        description: "Your account is on the Free plan.",
      };
  }
}
