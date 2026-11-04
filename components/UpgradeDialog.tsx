"use client";

import Link from "next/link";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type UpgradeReason = { title: string; description?: string };

const defaultReason: UpgradeReason = {
  title: "Upgrade your plan",
  description:
    "Get more agent prompts, unlimited workspaces, shared links, and PDF exports.",
};

const upgradeDialogContext = React.createContext<(reason?: UpgradeReason | null) => void>(
  () => {},
);

export function UpgradeDialogProvider({ children }: { children: React.ReactNode }) {
  const [reason, setReason] = React.useState<UpgradeReason | null>(null);

  return (
    <upgradeDialogContext.Provider value={(next) => setReason(next ?? defaultReason)}>
      {children}
      <Dialog open={reason !== null} onOpenChange={(open) => !open && setReason(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{reason?.title}</DialogTitle>
            {reason?.description && <DialogDescription>{reason.description}</DialogDescription>}
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Compare the plans available for your account or active organization.
          </p>
          <Button asChild>
            <Link href="/pricing" onClick={() => setReason(null)}>
              Compare plans
            </Link>
          </Button>
        </DialogContent>
      </Dialog>
    </upgradeDialogContext.Provider>
  );
}

export function useUpgradeDialog() {
  return React.useContext(upgradeDialogContext);
}
