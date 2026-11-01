"use server";

import { FREE_WORKSPACE_LIMIT, LimitError } from "@/lib/plan-limits";
import { checkUser } from "./check-user";
import { auth } from "@clerk/nextjs/server";
import { getWorkspaceScope, scopeWhere } from "@/lib/workspace-scope";
import { getEntitlements, workspaceOwnerSelect } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withLastActivity, workspaceCardSelect } from "@/lib/workspace-status";
import { WorkspaceCardData } from "@/components/workspaceCard";
import { WorkspaceStatus } from "@/lib/generated/prisma/enums";
import { canAccessWorkspace } from "@/lib/workspace-access";

function revalidateWorkspaceLists() {
  revalidatePath("/workspaces");
  revalidatePath("/dashboard");
}

export async function getRecentWorkspaces(): Promise<{
  orgName: string;
  workspaces: WorkspaceCardData[];
}> {
  const RECENT_COUNT = 4;

  const user = await checkUser();

  if (!user) throw new Error("User not authenticated");

  const { orgName, where } = await getWorkspaceScope(user.id);

  const workspaces = await prisma.workspace.findMany({
    where,
    select: workspaceCardSelect,
  });

  const recentWorkspaces = workspaces
    .map(withLastActivity)
    .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
    .slice(0, RECENT_COUNT);

  return {
    orgName,
    workspaces: recentWorkspaces,
  };
}

export async function getWorkspaces(): Promise<{
  orgName: string;
  workspaces: (WorkspaceCardData & { position: number })[];
}> {
  const user = await checkUser();

  if (!user) throw new Error("User not authenticated");

  const { orgName, where } = await getWorkspaceScope(user.id);

  const workspaces = await prisma.workspace.findMany({
    where,
    select: { ...workspaceCardSelect, position: true },
    orderBy: { position: "asc" },
  });

  return {
    orgName,
    workspaces: workspaces.map(withLastActivity),
  };
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

// Leaving description undefined keeps it as-is (the header's inline rename only sends a name).
export async function updateWorkspace(
  workspaceId: string,
  name: string,
  description?: string,
) {
  if (!(await canAccessWorkspace(workspaceId)))
    throw new Error("Workspace not found");

  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Workspace name is required");

  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      name: trimmedName,
      ...(description !== undefined && {
        description: description.trim() || null,
      }),
    },
  });

  revalidateWorkspaceLists();
  revalidatePath(`/workspace/${workspaceId}`);
  return workspace;
}

// Any org member can delete a workspace, but only the creator and org admins can delete a workspace.
export async function deleteWorkspace(workspaceId: string) {
  const { userId, orgId, orgRole } = await auth();

  if (!userId || !canAccessWorkspace(workspaceId)) {
    throw new Error("workspace not found or access denied");
  }

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: workspaceOwnerSelect,
  });

  const isCreator = workspace.creator.clerkId === userId;
  const isOrgAdmin = orgRole === "org:admin" && workspace.clerkOrgId === orgId;

  if (!isCreator && !isOrgAdmin) {
    throw new Error("You do not have permission to delete this workspace");
  }

  //Doc and canvas are set to cascade on delete, so they will be deleted automatically when the workspace is deleted. it's agent prompts stay so usage can be tracked for billing purposes.

  await prisma.workspace.delete({
    where: { id: workspaceId },
  });

  revalidateWorkspaceLists();
}

// Called after a board drag-and-drop to update the positions of workspaces in the database.
export async function moveWorkspacePosition(
  workspaceId: string,
  status: WorkspaceStatus,
  position: number,
): Promise<void> {
  if (
    !Object.values(WorkspaceStatus).includes(status) ||
    !Number.isFinite(position)
  ) {
    throw new Error("Invalid status or position");
  }

  if (!canAccessWorkspace(workspaceId)) {
    throw new Error("workspace not found or access denied");
  }

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { status, position },
  });

  revalidateWorkspaceLists();
}
