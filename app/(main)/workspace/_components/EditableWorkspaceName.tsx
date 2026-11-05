"use client";

import { updateWorkspace } from "@/actions/workspace";
import { useFetch } from "@/hooks/use-fetch";
import React from "react";

function EditableWorkspaceName({
  workspaceId,
  initialName,
}: {
  workspaceId: string;
  initialName: string;
}) {
  const [name, setName] = React.useState(initialName);
  const [isEditing, setIsEditing] = React.useState(false);

  const { fn: updateWorkspaceNameFn, loading } = useFetch(updateWorkspace);

  const commit = async () => {
    setIsEditing(false);
    const trimmedName = name.trim();

    // Nothing to do if the name is empty, just revert to the initial name.
    if (!trimmedName || trimmedName === initialName) {
      setName(initialName);
      return;
    }

    setName(trimmedName);
    await updateWorkspaceNameFn(workspaceId, trimmedName);
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        disabled={!!loading}
        onClick={() => setIsEditing(true)}
        title="Rename workspace"
        className="max-w-[40vw] truncate rounded-md px-2 py-1 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:max-w-xs"
      >
        {name}
      </button>
    );
  }

  return (
    <input
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setName(initialName);
          setIsEditing(false);
        }
      }}
      aria-label="Workspace name"
      autoFocus
      className="w-48 max-w-[50vw] rounded-md border border-input bg-card px-2 py-1 text-sm font-medium text-foreground shadow-xs outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-ring"
    />
  );
}

export default EditableWorkspaceName;
