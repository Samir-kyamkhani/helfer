"use client";

import { usePathname } from "next/navigation";
import React from "react";
import SiteHeader from "./SiteHeader";

function AppShell({ children }: { children: React.ReactNode }) {
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

export default AppShell;
