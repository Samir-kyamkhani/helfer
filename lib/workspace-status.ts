// Fields every workspace card needs, including what withLastActivity reads

import { WorkspaceStatus } from "./generated/prisma/enums";

export const workspaceCardSelect = {
  id: true,
  name: true,
  description: true,
  status: true,
  updatedAt: true,
  creator: { select: { name: true, imageUrl: true } },
  doc: { select: { updatedAt: true } },
  canvas: { select: { updatedAt: true } },
} as const;

type Dated = { updatedAt: Date } | null;

// A workspace owna updatedAt only change on rename or move, so real activity also count Edit to its canvas and docs

export function withLastActivity<
  T extends { updatedAt: Date; doc: Dated; canvas: Dated },
>(workspace: T) {
  const times = [
    workspace.updatedAt,
    workspace.doc?.updatedAt,
    workspace.canvas?.updatedAt,
  ];

  return {
    ...workspace,
    lastActivity: new Date(Math.max(...times.map((t) => t?.getTime() || 0))),
  };
}

export const WORKSPACE_STATUSES: { status: WorkspaceStatus; title: string }[] =
  [
    { status: "PLANNING", title: "planning" },
    { status: "IN_PROGRESS", title: "in progress" },
    { status: "IN_REVIEW", title: "in review" },
    { status: "DONE", title: "done" },
  ];

export function statusTtile(status: WorkspaceStatus) {
  return WORKSPACE_STATUSES.find((s) => s.status === status)?.title ?? status;
}

