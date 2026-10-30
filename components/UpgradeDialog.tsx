"use client";

import { PricingTable, useAuth } from "@clerk/nextjs";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type UpgradeReason = { title: string; description?: string };

const defaultReason = {
  title: "Upgrade your plan",
  description:
    "Get more agents prompt, unlimited workspaces, shared links and pdf exports.",
};

const upgradeDialogContext = React.createContext<
  (Reason?: UpgradeReason | null) => void
>(() => {});

export function UpgradeDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [reason, setReason] = React.useState<UpgradeReason | null>(null);
  const { orgId } = useAuth();
  const closeDialog = React.useCallback(() => setReason(null), []);

  return (
    <upgradeDialogContext.Provider
      value={(next) => setReason(next ?? defaultReason)}
    >
      {children}

      <Dialog
        modal={false}
        open={reason !== null}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader className="items-center text-center">
            <DialogTitle className="text-2x1">{reason?.title}</DialogTitle>
            {reason?.description && (
              <DialogDescription>{reason.description}</DialogDescription>
            )}
          </DialogHeader>

          <PricingTable for={orgId ? "organization" : "user"} />
        </DialogContent>
      </Dialog>
    </upgradeDialogContext.Provider>
  );
}

export function useUpgradeDialog() {
  return React.useContext(upgradeDialogContext);
}
