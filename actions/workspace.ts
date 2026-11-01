"use server";

import { FREE_WORKSPACE_LIMIT, LimitError } from "@/lib/plan-limits";
import { checkUser } from "./check-user";
import { auth } from "@clerk/nextjs/server";
import { getWorkspaceScope, scopeWhere } from "@/lib/workspace-scope";
import { getEntitlements } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withLastActivity, workspaceCardSelect } from "@/lib/workspace-status";
import { WorkspaceCardData } from "@/components/workspaceCard";

function revalidateWorkspaceLists() {
  revalidatePath("/workspaces");
  revalidatePath("/dashboard");
}

export async function createWorkspace(
  name: string,
  description?: string,
): Promise<{ workspace: { id: string } } | { limit: LimitError }> {
  const user = await checkUser();

  if (!user) throw new Error("User not authenticated");

  const trimedName = name.trim();

  if (trimedName.length === 0) {
    throw new Error("Workspace name cannot be empty");
  }

  // Belongs to whicever org is active; no active org means a personal workspace

  const { orgId } = await auth();
  const scope = scopeWhere(orgId, user.id);

  const { unlimitedWorkspaces } = await getEntitlements(orgId ?? user.clerkId);

  if (
    !unlimitedWorkspaces &&
    (await prisma.workspace.count({ where: scope })) >= FREE_WORKSPACE_LIMIT
  ) {
    return { limit: "workspaces" };
  }

  const top = await prisma.workspace.findFirst({
    where: { status: "PLANNING", ...scope },
    orderBy: { position: "asc" },
    select: { position: true },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: trimedName,
      description: description?.trim() || null,
      creatorId: user.id,
      clerkOrgId: orgId || null,
      position: top ? top.position - 1 : 0,
      doc: { create: {} },
      canvas: { create: {} },
    },
  });

  revalidateWorkspaceLists();

  return { workspace: { id: workspace.id } };
}

export async function getWorkspaces(): Promise<{
  orgName: string;
  workspaces: WorkspaceCardData[];
}> {
  const user = await checkUser();

  if (!user) throw new Error("User not authenticated");

  const { orgName, where } = await getWorkspaceScope(user.id);

  const workspaces = await prisma.workspace.findMany({
    where,
    select: workspaceCardSelect,
  });

  return {
    orgName,
    workspaces: workspaces.map(withLastActivity),
  };
}
