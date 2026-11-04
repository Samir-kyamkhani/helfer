import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";

export async function getActiveOrganization() {
  const session = await getCurrentSession();
  const organizationId = session?.session.activeOrganizationId;
  if (!session || !organizationId) return null;

  const membership = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: session.user.id,
      },
    },
    select: {
      role: true,
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!membership) return null;
  return { ...membership.organization, role: membership.role };
}

export async function getOrganizationMembership(
  organizationId: string,
  userId: string,
) {
  return prisma.member.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { role: true, organizationId: true },
  });
}
