"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

type Organization = { id: string; name: string; slug: string; logo?: string | null };

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export function OrganizationSettings() {
  const { data: session } = authClient.useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeId, setActiveId] = useState("");
  const [newName, setNewName] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const activeOrganization = organizations.find((org) => org.id === activeId);

  const refresh = useCallback(async () => {
    const result = await authClient.organization.list();
    if (result.error) {
      setError(result.error.message ?? "Unable to load organizations.");
      return;
    }
    setOrganizations(result.data ?? []);
    setActiveId((current) => current || session?.session.activeOrganizationId || "");
  }, [session?.session.activeOrganizationId]);

  useEffect(() => {
    let active = true;
    authClient.organization.list().then((result) => {
      if (!active) return;
      if (result.error) {
        setError(result.error.message ?? "Unable to load organizations.");
        return;
      }
      setOrganizations(result.data ?? []);
      setActiveId((current) => current || session?.session.activeOrganizationId || "");
    });
    return () => { active = false; };
  }, [session?.session.activeOrganizationId]);

  const chooseOrganization = async (id: string) => {
    setError("");
    const result = await authClient.organization.setActive({ organizationId: id || null });
    if (result.error) setError(result.error.message ?? "Unable to switch organization.");
    else {
      setActiveId(id);
      window.location.reload();
    }
  };

  const createOrganization = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const organizationName = newName.trim();
    const result = await authClient.organization.create({
      name: organizationName,
      slug: slugify(organizationName),
    });
    if (result.error) setError(result.error.message ?? "Unable to create organization.");
    else if (result.data) {
      setNewName("");
      setNotice("Organization created.");
      await refresh();
      await authClient.organization.setActive({ organizationId: result.data.id });
      window.location.reload();
    }
    setBusy(false);
  };

  const saveOrganization = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeOrganization) return;
    setBusy(true);
    setError("");
    setNotice("");
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();
    const logo = String(formData.get("logo") ?? "").trim();
    if (logo && !/^https:\/\//i.test(logo)) {
      setError("Organization logo URLs must use HTTPS.");
      setBusy(false);
      return;
    }
    const result = await authClient.organization.update({
      organizationId: activeOrganization.id,
      data: { name: name.trim(), slug: slugify(slug), logo: logo.trim() || null },
    });
    if (result.error) setError(result.error.message ?? "Unable to update organization.");
    else {
      setNotice("Organization settings updated.");
      await refresh();
    }
    setBusy(false);
  };

  const deleteOrganization = async () => {
    if (!activeOrganization || !window.confirm(`Delete ${activeOrganization.name}? This removes its membership and invitations.`)) return;
    setBusy(true);
    setError("");
    const result = await authClient.organization.delete({ organizationId: activeOrganization.id });
    if (result.error) setError(result.error.message ?? "Unable to delete organization.");
    else {
      setNotice("Organization deleted.");
      setActiveId("");
      await authClient.organization.setActive({ organizationId: null });
      await refresh();
      window.location.reload();
    }
    setBusy(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-2xl border border-white/10 bg-white/3 p-6">
        <h2 className="text-xl font-semibold">Your organizations</h2>
        <p className="mt-1 text-sm text-muted-foreground">Switch the active team workspace or create a new one.</p>
        <div className="mt-5 space-y-2">
          <button
            className={`w-full rounded-lg border px-3 py-3 text-left text-sm ${!session?.session.activeOrganizationId ? "border-primary/50 bg-primary/5" : "border-white/8 hover:bg-white/5"}`}
            onClick={() => void chooseOrganization("")}
            type="button"
          >
            <span className="block font-medium">Personal</span>
            <span className="mt-1 block text-xs text-muted-foreground">Your personal workspace</span>
          </button>
          {organizations.map((organization) => (
            <button
              key={organization.id}
              className={`w-full rounded-lg border px-3 py-3 text-left text-sm ${organization.id === session?.session.activeOrganizationId ? "border-primary/50 bg-primary/5" : "border-white/8 hover:bg-white/5"}`}
              onClick={() => void chooseOrganization(organization.id)}
              type="button"
            >
              <span className="block font-medium">{organization.name}</span>
              <span className="mt-1 block text-xs text-muted-foreground">/{organization.slug}</span>
            </button>
          ))}
        </div>
        <form className="mt-6 border-t border-white/8 pt-5" onSubmit={createOrganization}>
          <label className="block space-y-2 text-sm">
            <span>Create an organization</span>
            <input
              className="h-11 w-full rounded-lg border border-white/12 bg-black/15 px-3"
              maxLength={80}
              minLength={2}
              required
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Acme Studio"
            />
          </label>
          <Button className="mt-3" disabled={busy} type="submit">Create organization</Button>
        </form>
      </section>

      <section key={activeOrganization?.id ?? "none"} className="rounded-2xl border border-white/10 bg-white/3 p-6">
        <h2 className="text-xl font-semibold">Organization profile</h2>
        {activeOrganization ? (
          <form className="mt-5 space-y-4" onSubmit={saveOrganization}>
            <label className="block space-y-2 text-sm">
              <span>Name</span>
              <input name="name" className="h-11 w-full rounded-lg border border-white/12 bg-black/15 px-3" maxLength={80} minLength={2} required defaultValue={activeOrganization.name} />
            </label>
            <label className="block space-y-2 text-sm">
              <span>Slug</span>
              <input name="slug" className="h-11 w-full rounded-lg border border-white/12 bg-black/15 px-3" maxLength={64} minLength={2} required defaultValue={activeOrganization.slug} />
              <span className="text-xs text-muted-foreground">Use letters, numbers, and hyphens.</span>
            </label>
            <label className="block space-y-2 text-sm">
              <span>Logo URL</span>
              <input name="logo" className="h-11 w-full rounded-lg border border-white/12 bg-black/15 px-3" placeholder="https://example.com/logo.png" type="url" defaultValue={activeOrganization.logo ?? ""} />
            </label>
            <div className="flex flex-wrap gap-3">
              <Button disabled={busy} type="submit">Save organization</Button>
              <Button disabled={busy} onClick={() => void deleteOrganization()} type="button" variant="destructive">Delete organization</Button>
            </div>
          </form>
        ) : (
          <p className="mt-5 rounded-lg border border-dashed border-white/12 p-5 text-sm text-muted-foreground">
            Select an organization to update its profile. Organization changes require an admin or owner role.
          </p>
        )}
        {(notice || error) && <p className={`mt-4 text-sm ${error ? "text-destructive" : "text-primary"}`} role={error ? "alert" : "status"}>{error || notice}</p>}
      </section>
    </div>
  );
}
