import { getWorkspaces } from "@/actions/workspace";
import { Button } from "@/components/ui/button";
import { WorkspaceDialog } from "@/components/WorkspaceDialog";
import { Plus } from "lucide-react";
import WorkspaceBoard from "./_components/WorkspaceBoard";
import { Suspense } from "react";
import { SuspenseFallback } from "@/components/SuspenseFallback";

export default function WorkspacesPage() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <WorkspacesContent />
    </Suspense>
  );
}

async function WorkspacesContent() {
  const { orgName, workspaces } = await getWorkspaces();

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
        <div className="min-w-0">
          <p className="eyebrow">{orgName}</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
            All workspaces
          </h1>
        </div>
        <WorkspaceDialog
          trigger={
            <Button className="gap-2 shadow-sm">
              <Plus className="size-4" />
              New workspace
            </Button>
          }
        />
      </div>

      {workspaces.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong bg-surface px-6 py-16 text-center text-sm text-muted-foreground">
          No workspaces yet. Start one from the dashboard or with New workspace.
        </p>
      ) : (
        <WorkspaceBoard workspaces={workspaces} />
      )}
    </div>
  );
}
