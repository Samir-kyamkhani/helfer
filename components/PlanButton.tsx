"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getActivePromptUsage } from "@/actions/usage";

type Usage = Awaited<ReturnType<typeof getActivePromptUsage>>;

const USAGE_CHANGED_EVENT = "helfer:prompt-usage-changed";

export function refreshPromptUsage() {
  window.dispatchEvent(new Event(USAGE_CHANGED_EVENT));
}

export function PlanButton({
  upgradeOnlyWhenOut = false,
}: {
  upgradeOnlyWhenOut?: boolean;
}) {
  const [usage, setUsage] = useState<Usage>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      getActivePromptUsage().then((next) => !cancelled && setUsage(next));
    load();
    window.addEventListener(USAGE_CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(USAGE_CHANGED_EVENT, load);
    };
  }, []);

  if (!usage) return null;

  const { used, limit, isPaid, planName } = usage;
  const isOut = limit > 0 && used >= limit;

  return (
    <Link
      href="/settings/billing"
      title={`${used.toLocaleString()} of ${limit.toLocaleString()} agent prompts used this month`}
      className="flex h-8 items-center gap-2.5 rounded-full border border-white/10 bg-white/3 px-3 text-xs transition-colors hover:bg-white/8"
    >
      <span className="font-medium text-foreground">{planName}</span>
      <span className="h-1 w-12 overflow-hidden rounded-full bg-white/10">
        <span
          className={`block h-full rounded-full ${isOut ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${limit ? Math.min(100, (used / limit) * 100) : 0}%` }}
        />
      </span>
      <span className="text-muted-foreground tabular-nums">
        {used.toLocaleString()}/{limit.toLocaleString()}
      </span>
      {!isPaid && (!upgradeOnlyWhenOut || isOut) && (
        <span className="border-l border-white/10 pl-2 font-medium text-primary">
          Upgrade
        </span>
      )}
    </Link>
  );
}
