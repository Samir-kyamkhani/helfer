"use client";
import { WorkspaceCard, WorkspaceCardData } from "@/components/workspaceCard";
import React from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from "@hello-pangea/dnd";
import { WORKSPACE_STATUSES } from "@/lib/workspace-status";
import { WorkspaceStatus } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useFetch } from "@/hooks/use-fetch";
import { deleteWorkspace, moveWorkspacePosition } from "@/actions/workspace";
import { toast } from "sonner";
import { WorkspaceDialog } from "@/components/WorkspaceDialog";

type BoardWorkspace = WorkspaceCardData & { position: number };

const columnItems = (items: BoardWorkspace[], status: WorkspaceStatus) => {
  return items
    .filter((item) => item.status === status)
    .sort((a, b) => a.position - b.position);
};

const positionBetween = (before?: BoardWorkspace, after?: BoardWorkspace) => {
  if (before && after) return (before.position + after.position) / 2;
  if (before) return before.position + 1;
  if (after) return after.position - 1;
  return 0; // If there are no items in the column, return 0 as the position for the new item.
};

function WorkspaceBoard({ workspaces }: { workspaces: BoardWorkspace[] }) {
  const [items, setItems] = React.useState(workspaces);

  // Re-sync when the server sends fresh data. This is important for when a workspace is created or deleted, so the board updates without a full page refresh.
  const [prevWorkspaces, setPrevWorkspaces] = React.useState(workspaces);

  if (prevWorkspaces !== workspaces) {
    setPrevWorkspaces(workspaces);
    setItems(workspaces);
  }

  // Slected workspace for drag-and-drop. This is used to track which workspace is being dragged.
  const [selectedWorkspace, setSelectedWorkspace] =
    React.useState<BoardWorkspace | null>(null);
  const [openDialog, setOpenDialog] = React.useState<"edit" | "delete" | null>(
    null,
  );

  const { fn: deleteWorkspaceFn, loading: isDeleting } =
    useFetch(deleteWorkspace);

  const openFor = (workspace: BoardWorkspace, dialog: "edit" | "delete") => {
    setSelectedWorkspace(workspace);
    setOpenDialog(dialog);
  };

  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // keep the dialog open while deleting, so the user knows something is happening
    e.preventDefault();
    if (!selectedWorkspace) return;
    await deleteWorkspaceFn(selectedWorkspace.id);
    setOpenDialog(null);
  };

  const handleDragEnd = async ({
    draggableId,
    source,
    destination,
  }: DropResult) => {
    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const status = destination.droppableId as WorkspaceStatus;
    const targetWorkspace = columnItems(items, status).filter(
      (item) => item.id !== draggableId,
    );

    const position = positionBetween(
      targetWorkspace[destination.index - 1],
      targetWorkspace[destination.index],
    );

    const prevItems = items;
    setItems(
      items.map((item) =>
        item.id === draggableId ? { ...item, status, position } : item,
      ),
    );

    try {
      await moveWorkspacePosition(draggableId, status, position);
    } catch {
      setItems(prevItems);
      toast.error("Failed to move workspace. Please try again.");
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {WORKSPACE_STATUSES.map((column) => {
          const columnWorkspaces = columnItems(items, column.status);
          return (
            <div
              key={column.status}
              className="flex flex-col rounded-lg bg-white/3"
            >
              <div className="flex items-center gap-2 px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {column.title}
                <span className="font-normal">{columnWorkspaces.length}</span>
              </div>

              <Droppable droppableId={column.status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex min-h-40 flex-1 flex-col gap-1.5 rounded-b-lg p-2 transition-colors ${
                      snapshot.isDraggingOver ? "bg-primary/5" : ""
                    }`}
                  >
                    {columnWorkspaces.map((workspace, index) => (
                      <Draggable
                        key={workspace.id}
                        draggableId={workspace.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <WorkspaceCard
                              workspace={workspace}
                              highlight={snapshot.isDragging}
                              actions={
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      aria-label="Workspace options"
                                      className="absolute top-2 right-2 size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                                    >
                                      <MoreHorizontal className="size-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuGroup>
                                      <DropdownMenuItem
                                        onSelect={() =>
                                          openFor(workspace, "edit")
                                        }
                                      >
                                        <Pencil className="size-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onSelect={() =>
                                          openFor(workspace, "delete")
                                        }
                                      >
                                        <Trash2 className="size-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              }
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>

      {selectedWorkspace && (
        <WorkspaceDialog
          workspace={selectedWorkspace}
          open={openDialog === "edit"}
          onOpenChange={(open) => !open && setOpenDialog(null)}
        />
      )}

      <AlertDialog
        open={openDialog === "delete"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &ldquo;{selectedWorkspace?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the workspace, including its doc and
              canvas. It can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={!!isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DragDropContext>
  );
}

export default WorkspaceBoard;
