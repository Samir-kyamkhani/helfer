import { BillingOwnerType, SubscriptionStatus } from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { FREE_MONTHLY_PROMPTS, FREE_WORKSPACE_LIMIT } from "@/lib/plan-limits";
import { getCurrentSession } from "@/lib/auth/session";

export type BillingOwner = {
  ownerType: BillingOwnerType;
  ownerId: string;
};

export function billingOwnerKey(owner: BillingOwner) {
  return `${owner.ownerType.toLowerCase()}:${owner.ownerId}`;
}

export const workspaceOwnerSelect = {
  organizationId: true,
  creator: { select: { id: true } },
} as const;

type WorkspaceOwner = Prisma.WorkspaceGetPayload<{
  select: typeof workspaceOwnerSelect;
}>;

async function ownerForWorkspace(workspace: WorkspaceOwner): Promise<BillingOwner> {
  if (workspace.organizationId) {
    return {
      ownerType: BillingOwnerType.ORGANIZATION,
      ownerId: workspace.organizationId,
    };
  }

  return {
    ownerType: BillingOwnerType.USER,
    ownerId: workspace.creator.id,
  };
}

export async function getWorkspaceOwnerId(workspaceId: string) {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: workspaceOwnerSelect,
  });
  return ownerForWorkspace(workspace);
}

export async function getEntitlements(owner: BillingOwner) {
  const now = new Date();
  await prisma.subscription.updateMany({
    where: {
      ownerType: owner.ownerType,
      ownerId: owner.ownerId,
      provider: "MANUAL",
      status: {
        in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE],
      },
      currentPeriodEnd: { lte: now },
    },
    data: { status: SubscriptionStatus.CANCELED, endedAt: now, cancelAtPeriodEnd: false },
  });
  await prisma.subscription.updateMany({
    where: {
      ownerType: owner.ownerType,
      ownerId: owner.ownerId,
      provider: { in: ["STRIPE", "RAZORPAY"] },
      status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE] },
      cancelAtPeriodEnd: true,
      currentPeriodEnd: { lte: now },
    },
    data: { status: SubscriptionStatus.CANCELED, endedAt: now, cancelAtPeriodEnd: false },
  });
  const subscription = await prisma.subscription.findFirst({
    where: {
      ownerType: owner.ownerType,
      ownerId: owner.ownerId,
      status: {
        in: [
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.PAST_DUE,
          SubscriptionStatus.TRIALING,
        ],
      },
    },
    include: { plan: true },
    orderBy: { updatedAt: "desc" },
  });

  const members =
    owner.ownerType === BillingOwnerType.ORGANIZATION
      ? await prisma.member.count({ where: { organizationId: owner.ownerId } })
      : 1;
  const plan = subscription?.plan;
  const promptLimit = plan
    ? plan.monthlyPromptLimit * (owner.ownerType === BillingOwnerType.ORGANIZATION ? Math.max(1, members) : 1)
    : FREE_MONTHLY_PROMPTS;

  return {
    isPaid: Boolean(plan && (plan.monthlyPrice > 0 || plan.yearlyPrice > 0)),
    planName: plan?.name ?? "Free",
    promptLimit,
    workspaceLimit: plan?.unlimitedWorkspaces ? null : plan?.workspaceLimit ?? FREE_WORKSPACE_LIMIT,
    unlimitedWorkspaces: plan?.unlimitedWorkspaces ?? false,
    publicSharing: plan?.publicSharing ?? false,
    pdfExport: plan?.pdfExport ?? false,
  };
}

export async function getWorkspaceEntitlements(workspace: WorkspaceOwner) {
  const owner = await ownerForWorkspace(workspace);
  const entitlements = await getEntitlements(owner);
  if (owner.ownerType === BillingOwnerType.ORGANIZATION) return entitlements;

  const session = await getCurrentSession();
  const organizationId = session?.session.activeOrganizationId;
  if (!session || !organizationId) return entitlements;
  const membership = await prisma.member.findUnique({
    where: { organizationId_userId: { organizationId, userId: session.user.id } },
    select: { organizationId: true },
  });
  if (!membership) return entitlements;
  const organizationEntitlements = await getEntitlements({
    ownerType: BillingOwnerType.ORGANIZATION,
    ownerId: organizationId,
  });
  return {
    ...entitlements,
    isPaid: entitlements.isPaid || organizationEntitlements.isPaid,
    promptLimit: Math.max(entitlements.promptLimit, organizationEntitlements.promptLimit),
    unlimitedWorkspaces: entitlements.unlimitedWorkspaces || organizationEntitlements.unlimitedWorkspaces,
    publicSharing: entitlements.publicSharing || organizationEntitlements.publicSharing,
    pdfExport: entitlements.pdfExport || organizationEntitlements.pdfExport,
  };
}

function startOfMonthUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getPromptUsage(owner: BillingOwner) {
  const [{ promptLimit, isPaid, planName }, used] = await Promise.all([
    getEntitlements(owner),
    prisma.agentPrompt.count({
      where: {
        ownerId: billingOwnerKey(owner),
        createdAt: { gte: startOfMonthUtc() },
      },
    }),
  ]);
  return { used, limit: promptLimit, isPaid, planName };
}

export async function recordPrompt(
  owner: BillingOwner,
  userId: string,
  workspaceId: string,
) {
  await prisma.agentPrompt.create({
    data: {
      ownerId: billingOwnerKey(owner),
      userId,
      workspaceId,
    },
  });
}
