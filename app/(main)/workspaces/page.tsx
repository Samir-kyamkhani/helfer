import { getWorkspaces } from "@/actions/workspace";
import { Button } from "@/components/ui/button";
import { WorkspaceDialog } from "@/components/WorkspaceDialog";
import { Plus } from "lucide-react";
import WorkspaceBoard from "./_components/WorkspaceBoard";
import { Suspense } from "react";

export default function WorkspacesPage() {
  return (
    <Suspense fallback={<div>Loading workspaces...</div>}>
      <WorkspacesContent />
    </Suspense>
  );
}

async function WorkspacesContent() {
  const { orgName, workspaces } = await getWorkspaces();

  return (
    <div className="p-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{orgName}</p>
          <h1 className="text-2xl font-semibold">All workspaces</h1>
        </div>
        <WorkspaceDialog
          trigger={
            <Button className="gap-2">
              <Plus className="size-4" />
              New workspace
            </Button>
          }
        />
      </div>

      {workspaces.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 py-16 text-center text-sm text-muted-foreground">
          No workspaces yet. Start one from the dashboard or with New workspace.
        </p>
      ) : (
        <WorkspaceBoard workspaces={workspaces} />
      )}
    </div>
  );
}
