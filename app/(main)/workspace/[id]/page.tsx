import { getWorkspace } from "@/actions/workspace";
import { canAccessWorkspace } from "@/lib/workspace-access";
import { WorkspaceEditorsProvider } from "@/providers/WorkspaceEditorsContext";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";
import EditableWorkspaceName from "../_components/EditableWorkspaceName";
import { Button } from "@/components/ui/button";
import type { TLEditorSnapshot } from "tldraw";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { CanvasEditor } from "../_components/CanvasEditor";
import { Block } from "@blocknote/core";
import { DocEditor } from "../_components/DocEditorLoader";
import { AgentToggleButton } from "../_components/AgentTogleButton";
import type { UIMessage } from "ai";
import { PlanButton } from "@/components/PlanButton";
import { ShareDialog } from "../_components/ShareDialog";
import { getWorkspaceEntitlements } from "@/lib/billing";
import { SuspenseFallback } from "@/components/SuspenseFallback";

type ViewMode = "doc" | "canvas" | "both";

function parseViewMode(mode: string | string[] | undefined): ViewMode {
  return mode === "doc" || mode === "canvas" ? mode : "both";
}

async function WorkspaceContent({
  params,
  searchParams,
}: PageProps<"/workspace/[id]">) {
  const { id } = await params;
  const { view, prompt } = await searchParams;
  const viewMode = parseViewMode(view);

  if (!(await canAccessWorkspace(id))) notFound();

  const workspace = await getWorkspace(id);

  if (!workspace) notFound();
  const entitlements = await getWorkspaceEntitlements(workspace);

  const showDoc = viewMode === "doc" || viewMode === "both";
  const showCanvas = viewMode === "canvas" || viewMode === "both";
  const initialMessages = (workspace.agentChat?.messages ??
    []) as unknown as UIMessage[];

  return (
    <WorkspaceEditorsProvider>
      <div className="flex h-dvh flex-col overflow-hidden bg-background">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-3 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className="flex size-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Image
                src="/brand/mascot-dark.png"
                alt="Back to dashboard"
                width={24}
                height={24}
                className="size-6"
              />
            </Link>

            <EditableWorkspaceName
              workspaceId={id}
              initialName={workspace.name}
            />
          </div>

          {/* Segmented view switcher: the active segment is a raised white chip */}
          <div
            role="group"
            aria-label="Workspace view"
            className="flex items-center gap-0.5 rounded-lg border border-border bg-secondary p-0.5"
          >
            {(["doc", "both", "canvas"] as const).map((mode) => {
              const active = viewMode === mode;
              return (
                <Button
                  key={mode}
                  asChild
                  variant="ghost"
                  size="sm"
                  className={`capitalize ${
                    active
                      ? "bg-card text-foreground shadow-xs hover:bg-card"
                      : "text-muted-foreground hover:bg-transparent hover:text-foreground"
                  }`}
                >
                  <Link
                    aria-current={active ? "page" : undefined}
                    href={
                      mode === "both"
                        ? `/workspace/${id}`
                        : `/workspace/${id}?view=${mode}`
                    }
                  >
                    {mode === "doc" ? "Document" : mode}
                  </Link>
                </Button>
              );
            })}
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <PlanButton upgradeOnlyWhenOut />

            <ShareDialog
              workspaceId={id}
              workspaceName={workspace.name}
              initialShareToken={workspace.shareToken}
              canShare={entitlements.publicSharing}
              canExportPdf={entitlements.pdfExport}
            />

            <AgentToggleButton
              key={id}
              workspaceId={id}
              initialMessages={initialMessages}
              initialPrompt={typeof prompt === "string" ? prompt : undefined}
            />
          </div>
        </header>

        <ResizablePanelGroup
          key={viewMode}
          orientation="horizontal"
          className="flex-1"
        >
          {showDoc && (
            <ResizablePanel defaultSize={35} minSize={20}>
              <DocEditor
                key={id}
                workspaceId={id}
                initialContent={workspace.doc?.content as Block[] | null}
                initialState={
                  workspace.doc?.yjsState
                    ? Buffer.from(workspace.doc.yjsState).toString("base64")
                    : null
                }
              />
            </ResizablePanel>
          )}

          {showDoc && showCanvas && <ResizableHandle withHandle />}
          {showCanvas && (
            <ResizablePanel defaultSize={75} minSize={20}>
              <CanvasEditor
                workspaceId={id}
                initialSnapshot={
                  workspace.canvas?.content as TLEditorSnapshot | null
                }
              />
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>
    </WorkspaceEditorsProvider>
  );
}

export default function WorkspacePage(props: PageProps<"/workspace/[id]">) {
  return (
    <React.Suspense fallback={<SuspenseFallback fullScreen />}>
      <WorkspaceContent {...props} />
    </React.Suspense>
  );
}
