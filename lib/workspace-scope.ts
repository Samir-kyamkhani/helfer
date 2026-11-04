import { Prisma } from "./generated/prisma/client";
import { getActiveOrganization } from "@/lib/auth/organization";

export function scopeWhere(
  organizationId: string | null | undefined,
  userId: string,
): Prisma.WorkspaceWhereInput {
  if (organizationId) {
    return { organizationId };
  }

  return { organizationId: null, creatorId: userId };
}

export async function getWorkspaceScope(userId: string) {
  const organization = await getActiveOrganization();
  if (!organization || organization.role.length === 0) {
    return {
      orgName: "Personal",
      where: scopeWhere(null, userId),
    };
  }

  return {
    orgName: organization.name,
    where: scopeWhere(organization.id, userId),
  };
}
