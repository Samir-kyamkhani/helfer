import { BillingOwnerType } from "@/lib/generated/prisma/enums";
import { requireCurrentSession } from "@/lib/auth/session";
import { getActiveOrganization } from "@/lib/auth/organization";

export async function getCurrentBillingOwner() {
  const session = await requireCurrentSession();
  const organization = await getActiveOrganization();
  return {
    ownerType: organization ? BillingOwnerType.ORGANIZATION : BillingOwnerType.USER,
    ownerId: organization?.id ?? session.user.id,
    role: organization?.role ?? "owner",
    name: organization?.name ?? session.user.name,
  } as const;
}
