"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

type InvitationsResult = Awaited<ReturnType<typeof authClient.organization.listInvitations>>;
type InvitationRow = NonNullable<InvitationsResult["data"]>[number];
type UserInvitationsResult = Awaited<ReturnType<typeof authClient.organization.listUserInvitations>>;
type UserInvitationRow = NonNullable<UserInvitationsResult["data"]>[number];

export function OrganizationInvitations({ invitationId }: { invitationId?: string }) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const organizationId = session?.session.activeOrganizationId;
  const [organizationInvitations, setOrganizationInvitations] = useState<InvitationRow[]>([]);
  const [userInvitations, setUserInvitations] = useState<UserInvitationRow[]>([]);
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [received, roleResult, sent] = await Promise.all([
      authClient.organization.listUserInvitations(),
      organizationId
        ? authClient.organization.getActiveMemberRole({ query: { organizationId } })
        : Promise.resolve(null),
      organizationId
        ? authClient.organization.listInvitations({ query: { organizationId } })
        : Promise.resolve(null),
    ]);
    if (received.error) setError(received.error.message ?? "Unable to load invitations.");
    else setUserInvitations(received.data ?? []);
    if (roleResult && !roleResult.error) setRole(roleResult.data?.role ?? "");
    if (sent?.error) setError(sent.error.message ?? "Unable to load organization invitations.");
    else if (sent?.data) setOrganizationInvitations(sent.data);
  }, [organizationId]);

  useEffect(() => {
    let active = true;
    Promise.all([
      authClient.organization.listUserInvitations(),
      organizationId
        ? authClient.organization.getActiveMemberRole({ query: { organizationId } })
        : Promise.resolve(null),
      organizationId
        ? authClient.organization.listInvitations({ query: { organizationId } })
        : Promise.resolve(null),
    ]).then(([received, roleResult, sent]) => {
      if (!active) return;
      if (received.error) setError(received.error.message ?? "Unable to load invitations.");
      else setUserInvitations(received.data ?? []);
      if (roleResult && !roleResult.error) setRole(roleResult.data?.role ?? "");
      if (sent?.error) setError(sent.error.message ?? "Unable to load organization invitations.");
      else if (sent?.data) setOrganizationInvitations(sent.data);
    });
    return () => { active = false; };
  }, [organizationId]);

  const highlightedInvitation = invitationId && userInvitations.some((item) => item.id === invitationId);

  const respond = async (id: string, accept: boolean) => {
    setBusy(true);
    setError("");
    const result = accept
      ? await authClient.organization.acceptInvitation({ invitationId: id })
      : await authClient.organization.rejectInvitation({ invitationId: id });
    if (result.error) setError(result.error.message ?? "Unable to update this invitation.");
    else {
      const acceptedOrganizationId = result.data?.member?.organizationId;
      if (accept && acceptedOrganizationId) {
        await authClient.organization.setActive({ organizationId: acceptedOrganizationId });
      }
      setNotice(accept ? "Invitation accepted." : "Invitation declined.");
      await refresh();
      if (accept) router.push("/dashboard");
    }
    setBusy(false);
  };

  const revoke = async (id: string) => {
    setBusy(true);
    setError("");
    const result = await authClient.organization.cancelInvitation({ invitationId: id });
    if (result.error) setError(result.error.message ?? "Unable to revoke this invitation.");
    else {
      setNotice("Invitation revoked.");
      await refresh();
    }
    setBusy(false);
  };

  const resend = async (invitation: InvitationRow) => {
    setBusy(true);
    setError("");
    const result = await authClient.organization.inviteMember({
      organizationId: invitation.organizationId,
      email: invitation.email,
      role: invitation.role,
      resend: true,
    });
    if (result.error) setError(result.error.message ?? "Unable to resend this invitation.");
    else setNotice(`Invitation resent to ${invitation.email}.`);
    setBusy(false);
  };

  const canManage = role === "owner" || role === "admin";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/3 p-6">
        <h2 className="text-xl font-semibold">Invitations for you</h2>
        <p className="mt-1 text-sm text-muted-foreground">Accept invitations sent to your verified account email.</p>
        {highlightedInvitation && <p className="mt-4 text-sm text-primary">This invitation is ready to accept or reject.</p>}
        <div className="mt-5 divide-y divide-white/8">
          {userInvitations.map((invitation) => (
            <div key={invitation.id} className={`flex flex-wrap items-center justify-between gap-4 py-3 ${invitation.id === invitationId ? "rounded-lg bg-primary/5 px-3" : ""}`}>
              <div>
                <p className="font-medium">{invitation.organizationName}</p>
                <p className="text-xs text-muted-foreground">Role: {invitation.role} · Expires {new Date(invitation.expiresAt).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <Button disabled={busy} onClick={() => void respond(invitation.id, true)} size="sm" type="button">Accept</Button>
                <Button disabled={busy} onClick={() => void respond(invitation.id, false)} size="sm" type="button" variant="ghost">Decline</Button>
              </div>
            </div>
          ))}
          {userInvitations.length === 0 && <p className="py-4 text-sm text-muted-foreground">You have no pending invitations.</p>}
        </div>
      </section>

      {canManage && (
        <section className="rounded-2xl border border-white/10 bg-white/3 p-6">
          <h2 className="text-xl font-semibold">Sent invitations</h2>
          <p className="mt-1 text-sm text-muted-foreground">Resend a pending invitation or revoke it.</p>
          <div className="mt-5 divide-y divide-white/8">
            {organizationInvitations.filter((item) => item.status === "pending").map((invitation) => (
              <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-medium">{invitation.email}</p>
                  <p className="text-xs text-muted-foreground">{invitation.role} · Expires {new Date(invitation.expiresAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button disabled={busy} onClick={() => void resend(invitation)} size="sm" type="button" variant="outline">Resend</Button>
                  <Button disabled={busy} onClick={() => void revoke(invitation.id)} size="sm" type="button" variant="ghost">Revoke</Button>
                </div>
              </div>
            ))}
            {organizationInvitations.filter((item) => item.status === "pending").length === 0 && <p className="py-4 text-sm text-muted-foreground">No pending invitations for this organization.</p>}
          </div>
        </section>
      )}

      {(notice || error) && <p className={`text-sm ${error ? "text-destructive" : "text-primary"}`} role={error ? "alert" : "status"}>{error || notice}</p>}
    </div>
  );
}
