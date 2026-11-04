"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

type Organization = { id: string; name: string };

export function OrganizationSwitcher() {
  const { data: session } = authClient.useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    let cancelled = false;
    authClient.organization.list().then(({ data }) => {
      if (!cancelled) setOrganizations(data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectOrganization = async (organizationId: string) => {
    const result = await authClient.organization.setActive({
      organizationId: organizationId || null,
    });
    if (!result.error) window.location.reload();
  };

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Active organization"
        value={session?.session.activeOrganizationId ?? ""}
        onChange={(event) => void selectOrganization(event.target.value)}
        className="h-8 max-w-40 rounded-full border border-white/10 bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
      >
        <option value="">Personal</option>
        {organizations.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name}
          </option>
        ))}
      </select>
      <Link
        href="/settings/organizations"
        className="hidden text-xs text-muted-foreground transition-colors hover:text-foreground lg:inline"
      >
        Teams
      </Link>
    </div>
  );
}
