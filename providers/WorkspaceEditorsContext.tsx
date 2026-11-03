"use client";

import React from "react";
import type { Editor } from "tldraw";
import type { BlockNoteEditor } from "@blocknote/core";

const WorkspaceEditorsContext = React.createContext<{
  canvasEditor: Editor | null;
  setCanvasEditor: (editor: Editor | null) => void;
  docEditor: BlockNoteEditor | null;
  setDocEditor: (editor: BlockNoteEditor | null) => void;
} | null>(null);

export function WorkspaceEditorsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [canvasEditor, setCanvasEditor] = React.useState<Editor | null>(null);
  const [docEditor, setDocEditor] = React.useState<BlockNoteEditor | null>(
    null,
  );

  return (
    <WorkspaceEditorsContext.Provider
      value={{ canvasEditor, setCanvasEditor, docEditor, setDocEditor }}
    >
      {children}
    </WorkspaceEditorsContext.Provider>
  );
}

export function useWorkspaceEditors() {
  const context = React.useContext(WorkspaceEditorsContext);

  if (!context) {
    throw new Error(
      "useWorkspaceEditors must be used within a WorkspaceEditorsProvider",
    );
  }
  return context;
}
