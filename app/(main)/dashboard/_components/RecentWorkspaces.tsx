import { WorkspaceCard, WorkspaceCardData } from "@/components/workspaceCard";
import React from "react";

function RecentWorkspaces({ workspaces }: { workspaces: WorkspaceCardData[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {workspaces.map((workspace) => (
        <WorkspaceCard key={workspace.id} workspace={workspace} showStatus />
      ))}
    </div>
  );
}

export default RecentWorkspaces;
