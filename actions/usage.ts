"use server";

import { BillingOwnerType } from "@/lib/generated/prisma/enums";
import { getPromptUsage, type BillingOwner } from "@/lib/billing";
import { getActiveOrganization } from "@/lib/auth/organization";
import { getCurrentSession } from "@/lib/auth/session";

// Usage for the header: the selected org, or the personal account.
export async function getActivePromptUsage() {
  const session = await getCurrentSession();
  if (!session) return null;

  const organization = await getActiveOrganization();
  const owner: BillingOwner = organization
    ? {
        ownerType: BillingOwnerType.ORGANIZATION,
        ownerId: organization.id,
      }
    : {
        ownerType: BillingOwnerType.USER,
        ownerId: session.user.id,
      };

  return getPromptUsage(owner);
}
