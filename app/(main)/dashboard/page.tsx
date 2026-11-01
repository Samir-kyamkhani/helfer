import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { KanbanSquare, Plus } from "lucide-react";
import RecentWorkspaces from "./_components/RecentWorkspaces";
import WorkspaceDialog from "@/components/WorkspaceDialog";
import DashboardPrompt from "./_components/DashboardPrompt";
import { getRecentWorkspaces, getWorkspaces } from "@/actions/workspace";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const { orgName, workspaces } = await getWorkspaces();
  const { workspaces: recentWorkspaces } = await getRecentWorkspaces();

  return (
    <div className="p-8">
      <DashboardPrompt />
      <section className="mx-auto max-w-6x1">
        <div className="mb-4 flex items-end justify-between gap-4 ">
          <div>
            <p className="text-xs text-muted-foreground">{orgName}</p>
            <h2 className="text-lg font-semibold">Recent workspaces</h2>
          </div>
          <div className="flex items-center gap-2">
            {workspaces.length > 0 && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
              >
                <Link href="/workspaces">
                  <KanbanSquare className="size-4" />
                  View board ({workspaces.length})
                </Link>
              </Button>
            )}

            <WorkspaceDialog
              trigger={
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Plus className="size-4" />
                  New workspace
                </Button>
              }
            />
          </div>
        </div>

        {workspaces.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-muted-foreground">
            You have no workspaces yet. Create one to get started.
          </p>
        ) : (
          <RecentWorkspaces workspaces={recentWorkspaces} />
        )}
      </section>
    </div>
  );
}
