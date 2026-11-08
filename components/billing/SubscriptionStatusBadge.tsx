import { Badge } from "@/components/ui/badge";
import {
  subscriptionStatusPresentation,
  type SubscriptionStatusTone,
} from "@/lib/payments/subscription-status";

const toneVariants: Record<SubscriptionStatusTone, "default" | "secondary" | "destructive" | "outline"> = {
  success: "secondary",
  info: "secondary",
  warning: "outline",
  danger: "destructive",
  neutral: "outline",
};

const toneClasses: Record<SubscriptionStatusTone, string> = {
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  info: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  danger: "",
  neutral: "",
};

export function SubscriptionStatusBadge({
  status,
  endedAt,
  currentPeriodEnd,
}: {
  status?: string | null;
  endedAt?: Date | null;
  currentPeriodEnd?: Date | null;
}) {
  const presentation = subscriptionStatusPresentation(status, {
    endedAt,
    currentPeriodEnd,
  });
  return (
    <Badge
      variant={toneVariants[presentation.tone]}
      className={toneClasses[presentation.tone]}
    >
      {presentation.label}
    </Badge>
  );
}
