import React from "react";
import { requireCurrentSession } from "@/lib/auth/session";

export const instant = false;

async function MainLayout({ children }: { children: React.ReactNode }) {
  await requireCurrentSession();
  return <div className="flex flex-1 flex-col">{children}</div>;
}

export default MainLayout;
