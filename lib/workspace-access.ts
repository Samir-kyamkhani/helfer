import { auth, clerkClient } from "@clerk/nextjs/server";
import { workspaceOwnerSelect } from "./billing";
import { prisma } from "./prisma";

// Org workspace are open to all members of the org, while personal workspaces are only open to the creator.
export async function canAccessWorkspace(workspaceId: string) {
  const { orgId, userId } = await auth();

  if (!userId) return false;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: workspaceOwnerSelect,
  });

  if (!workspace) return false;

  if (!workspace.clerkOrgId) return workspace.creator.clerkId === userId;
  if (workspace.clerkOrgId === orgId) return true;

  // The session only knows the active org, so we need to check if the user is a member of the workspace's org.
  const clerk = await clerkClient();

  const { data: membership } = await clerk.users.getOrganizationMembershipList({
    userId: userId,
    limit: 100,
  });

  return membership.some((m) => m.organization.id === workspace.clerkOrgId);
}
