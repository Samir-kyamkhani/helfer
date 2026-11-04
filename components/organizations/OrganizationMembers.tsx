"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

type MemberResult = Awaited<ReturnType<typeof authClient.organization.listMembers>>;
type MemberRow = NonNullable<MemberResult["data"]>["members"][number];

export function OrganizationMembers() {
  const { data: session } = authClient.useSession();
  const organizationId = session?.session.activeOrganizationId;
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!organizationId) return;
    const [membersResult, roleResult] = await Promise.all([
      authClient.organization.listMembers({ query: { organizationId, limit: 100 } }),
      authClient.organization.getActiveMemberRole({ query: { organizationId } }),
    ]);
    if (membersResult.error) setError(membersResult.error.message ?? "Unable to load members.");
    else setMembers(membersResult.data?.members ?? []);
    if (!roleResult.error) setRole(roleResult.data?.role ?? "");
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) return;
    let active = true;
    Promise.all([
      authClient.organization.listMembers({ query: { organizationId, limit: 100 } }),
      authClient.organization.getActiveMemberRole({ query: { organizationId } }),
    ]).then(([membersResult, roleResult]) => {
      if (!active) return;
      if (membersResult.error) setError(membersResult.error.message ?? "Unable to load members.");
      else setMembers(membersResult.data?.members ?? []);
      if (!roleResult.error) setRole(roleResult.data?.role ?? "");
    });
    return () => { active = false; };
  }, [organizationId]);

  const inviteMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!organizationId) return;
    setBusy(true);
    setError("");
    setNotice("");
    const result = await authClient.organization.inviteMember({
      organizationId,
      email: email.trim().toLowerCase(),
      role: inviteRole,
    });
    if (result.error) setError(result.error.message ?? "Unable to invite this member.");
    else {
      setEmail("");
      setNotice("Invitation sent.");
    }
    setBusy(false);
  };

  const updateRole = async (memberId: string, nextRole: "admin" | "member") => {
    if (!organizationId) return;
    setBusy(true);
    setError("");
    const result = await authClient.organization.updateMemberRole({
      organizationId,
      memberId,
      role: nextRole,
    });
    if (result.error) setError(result.error.message ?? "Unable to update this role.");
    else await refresh();
    setBusy(false);
  };

  const removeMember = async (member: MemberRow) => {
    if (!organizationId || !window.confirm(`Remove ${member.user.name} from this organization?`)) return;
    setBusy(true);
    setError("");
    const result = await authClient.organization.removeMember({
      organizationId,
      memberIdOrEmail: member.userId,
    });
    if (result.error) setError(result.error.message ?? "Unable to remove this member.");
    else await refresh();
    setBusy(false);
  };

  if (!organizationId) {
    return (
      <section className="rounded-2xl border border-dashed border-white/12 p-6 text-sm text-muted-foreground">
        Choose an organization in the header to manage its members.
      </section>
    );
  }

  const canManage = role === "owner" || role === "admin";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/3 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Team members</h2>
            <p className="mt-1 text-sm text-muted-foreground">{members.length} of up to 100 members</p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs capitalize text-muted-foreground">Your role: {role || "member"}</span>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-white/8"><th className="pb-3 font-medium">Member</th><th className="pb-3 font-medium">Role</th><th className="pb-3 text-right font-medium">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="py-3">
                    <p className="font-medium">{member.user.name}</p>
                    <p className="text-xs text-muted-foreground">{member.user.email}</p>
                  </td>
                  <td className="py-3 capitalize text-muted-foreground">{member.role}</td>
                  <td className="py-3 text-right">
                    {canManage && member.role !== "owner" ? (
                      <div className="inline-flex items-center gap-2">
                        <select
                          aria-label={`Role for ${member.user.name}`}
                          className="h-9 rounded-md border border-white/10 bg-background px-2 text-xs"
                          disabled={busy}
                          value={member.role}
                          onChange={(event) => void updateRole(member.id, event.target.value as "admin" | "member")}
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                        <Button disabled={busy} onClick={() => void removeMember(member)} size="sm" type="button" variant="ghost">Remove</Button>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
              {members.length === 0 && <tr><td colSpan={3} className="py-5 text-center text-muted-foreground">No members found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {canManage && (
        <section className="rounded-2xl border border-white/10 bg-white/3 p-6">
          <h2 className="text-xl font-semibold">Invite a teammate</h2>
          <p className="mt-1 text-sm text-muted-foreground">The invitation will be sent to their email address.</p>
          <form className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={inviteMember}>
            <label className="flex-1 space-y-2 text-sm">
              <span>Email address</span>
              <input className="h-11 w-full rounded-lg border border-white/12 bg-black/15 px-3" maxLength={254} required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="space-y-2 text-sm">
              <span>Role</span>
              <select className="h-11 rounded-lg border border-white/12 bg-background px-3" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "member" | "admin")}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <Button disabled={busy} type="submit">Send invitation</Button>
          </form>
        </section>
      )}

      {(notice || error) && <p className={`text-sm ${error ? "text-destructive" : "text-primary"}`} role={error ? "alert" : "status"}>{error || notice}</p>}
    </div>
  );
}
