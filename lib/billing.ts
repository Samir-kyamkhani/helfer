import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { FREE_MONTHLY_PROMPTS } from "@/lib/plan-limits";

// Paid prompt allowances come from Clerk plan features (checked in order), per member for team plans.
const PROMPT_FEATURES = [
  { feature: "agent_prompts_2000", perMember: 2000 },
  { feature: "agent_prompts_500", perMember: 500 },
];

function normalizeFeatureSlug(slug: string) {
  return slug
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

// Everything is scoped to an "owner": a Clerk org id for org workspaces, or a Clerk user id for
// personal ones. Clerk prefixes its ids, so they can't collide.
export const workspaceOwnerSelect = {
  clerkOrgId: true,
  creator: { select: { clerkId: true } },
} as const;

export function workspaceOwnerId(workspace: {
  clerkOrgId: string | null;
  creator: { clerkId: string };
}) {
  return workspace.clerkOrgId ?? workspace.creator.clerkId;
}

// Org workspaces use their org's plan. Personal workspaces can use either the creator's plan
// or the currently active org's plan, matching the plan shown in the app header.
export async function getWorkspaceEntitlements(workspace: {
  clerkOrgId: string | null;
  creator: { clerkId: string };
}) {
  if (workspace.clerkOrgId) return getEntitlements(workspace.clerkOrgId);

  const personalEntitlements = await getEntitlements(workspace.creator.clerkId);
  const { orgId } = await auth();
  if (!orgId) return personalEntitlements;

  const orgEntitlements = await getEntitlements(orgId);
  return {
    isPaid: personalEntitlements.isPaid || orgEntitlements.isPaid,
    promptLimit: Math.max(
      personalEntitlements.promptLimit,
      orgEntitlements.promptLimit,
    ),
    unlimitedWorkspaces:
      personalEntitlements.unlimitedWorkspaces ||
      orgEntitlements.unlimitedWorkspaces,
    publicSharing:
      personalEntitlements.publicSharing || orgEntitlements.publicSharing,
    pdfExport: personalEntitlements.pdfExport || orgEntitlements.pdfExport,
  };
}

export async function getWorkspaceOwnerId(workspaceId: string) {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: workspaceOwnerSelect,
  });
  return workspaceOwnerId(workspace);
}

// The owner's plan features, looked up from Clerk on the server. This works for any owner, not
// just the org selected in the viewer's switcher, and even for signed-out viewers (shared links).
export async function getEntitlements(ownerId: string) {
  const clerk = await clerkClient();
  const isOrg = ownerId.startsWith("org_");
  const features = new Set<string>();
  let hasPaidPlan = false;

  try {
    const subscription = isOrg
      ? await clerk.billing.getOrganizationBillingSubscription(ownerId)
      : await clerk.billing.getUserBillingSubscription(ownerId);
    for (const item of subscription.subscriptionItems) {
      // past_due keeps access while Clerk retries the payment.
      if (item.status === "active" || item.status === "past_due") {
        if (item.plan && !item.plan.isDefault) hasPaidPlan = true;
        item.plan?.features.forEach((feature) =>
          features.add(normalizeFeatureSlug(feature.slug)),
        );
      }
    }
  } catch {
    // No subscription (or Clerk unreachable): treat as the free plan.
  }

  const paid = PROMPT_FEATURES.find(({ feature }) => features.has(feature));
  const isPaid = hasPaidPlan || !!paid;
  let promptLimit = FREE_MONTHLY_PROMPTS;
  if (paid) {
    const members = isOrg
      ? ((
          await clerk.organizations.getOrganization({
            organizationId: ownerId,
            includeMembersCount: true,
          })
        ).membersCount ?? 1)
      : 1;
    promptLimit = paid.perMember * members;
  }

  return {
    isPaid,
    promptLimit,
    unlimitedWorkspaces: features.has("unlimited_workspaces"),
    publicSharing: features.has("public_sharing") || hasPaidPlan,
    pdfExport: features.has("pdf_export"),
  };
}

function startOfMonthUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

// This month's prompts against the owner's allowance.
export async function getPromptUsage(ownerId: string) {
  const [{ promptLimit, isPaid }, used] = await Promise.all([
    getEntitlements(ownerId),
    prisma.agentPrompt.count({
      where: { ownerId, createdAt: { gte: startOfMonthUtc() } },
    }),
  ]);
  return { used, limit: promptLimit, isPaid };
}

export async function recordPrompt(
  ownerId: string,
  userId: string,
  workspaceId: string,
) {
  await prisma.agentPrompt.create({ data: { ownerId, userId, workspaceId } });
}
