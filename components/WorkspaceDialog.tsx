"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { useUpgradeDialog } from "./UpgradeDialog";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { useFetch } from "@/hooks/use-fetch";
import { createWorkspace } from "@/actions/workspace";
import { UPGRADE_REASONS } from "@/lib/plan-limits";
import { toast } from "sonner";

function WorkspaceDialog({ triger }: { triger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
        </DialogHeader>

        <WorkspaceDialogForm onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function WorkspaceDialogForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const router = useRouter();
  const openUpgradeDialog = useUpgradeDialog();

  const { loading, fn: createWorkspaceFn } = useFetch(createWorkspace);

  const handleSubmit = async () => {
    const result = await createWorkspaceFn(name, description);

    if (!result) return;

    onDone();

    if ("limit" in result)
      return openUpgradeDialog(UPGRADE_REASONS[result.limit]);

    toast.success("Workspace created successfully");

    router.push(`/workspaces/${result.workspace.id}`);
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="workspace-name">Name</Label>
        <Input
          id="workspace-name"
          placeholder="Q1 Marketing launch"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="workspace-description">Description</Label>
        <Textarea
          id="workspace-description"
          placeholder="what's this workspace about?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? "Creating..." : "Create Workspace"}
          </Button>
        </DialogFooter>
      </div>
    </>
  );
}

export default WorkspaceDialog;
