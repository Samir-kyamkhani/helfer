"use client";

import { usePathname } from "next/navigation";
import React, { Suspense } from "react";
import { SiteHeader } from "./SiteHeader";
import { SuspenseFallback } from "./SuspenseFallback";

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isFullScreenRoute =
    pathname?.startsWith("/workspace/") || pathname?.startsWith("/shared/");

  if (isFullScreenRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader />
      <div className="flex flex-1 flex-col pt-16">{children}</div>
    </>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<SuspenseFallback fullScreen />}>
      <AppShellContent>{children}</AppShellContent>
    </Suspense>
  );
}

export default AppShell;
