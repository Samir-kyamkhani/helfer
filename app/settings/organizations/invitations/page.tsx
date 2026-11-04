import { OrganizationInvitations } from "@/components/organizations/OrganizationInvitations";

export default async function OrganizationInvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ invitationId?: string | string[] }>;
}) {
  const { invitationId } = await searchParams;
  return (
    <OrganizationInvitations invitationId={Array.isArray(invitationId) ? invitationId[0] : invitationId} />
  );
}
