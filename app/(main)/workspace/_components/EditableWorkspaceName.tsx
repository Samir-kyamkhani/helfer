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

    await updateWorkspaceNameFn(workspaceId, name);
  };

  if (!isEditing) {
    return (
      <button
        disabled={!!loading}
        onClick={() => setIsEditing(true)}
        className="rounded-md px-1.5 py-0.5 text-sm font-medium transition-colors hover:bg-accent"
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
      autoFocus
      className="rounded-md border border-input bg-transparent px-1.5 py-0.5 text-sm font-medium outline-none focus:border-ring"
    />
  );
}

export default EditableWorkspaceName;
