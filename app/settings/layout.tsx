import type { ReactNode } from "react";
import { requireCurrentSession } from "@/lib/auth/session";
import { SettingsNav } from "@/components/settings/SettingsNav";

export const instant = false;

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  await requireCurrentSession();
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
      <div className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
          Account
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Settings
        </h1>
      </div>
      <SettingsNav />
      <div className="mt-8">{children}</div>
    </main>
  );
}
