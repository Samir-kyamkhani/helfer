import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function getWorkspaceAccess(workspaceId: string) {
  const session = await getCurrentSession();
  if (!session) return null;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      creatorId: true,
      organizationId: true,
    },
  });
  if (!workspace) return null;

  const isCreator = workspace.creatorId === session.user.id;
  if (!workspace.organizationId) {
    return isCreator
      ? { allowed: true, isCreator, role: null, organizationId: null }
      : null;
  }

  const membership = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: workspace.organizationId,
        userId: session.user.id,
      },
    },
    select: { role: true },
  });

  if (!membership) return null;
  return {
    allowed: true,
    isCreator,
    role: membership.role,
    organizationId: workspace.organizationId,
  };
}

export async function canAccessWorkspace(workspaceId: string) {
  return Boolean(await getWorkspaceAccess(workspaceId));
}
