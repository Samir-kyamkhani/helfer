"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import * as Y from "yjs";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import type { Block } from "@blocknote/core";
import { CollaborationExtension } from "@blocknote/core/yjs";
import { saveDocContent } from "@/actions/doc";
import type { Prisma } from "@/lib/generated/prisma/client";
import { colorForUser } from "@/lib/utils";
import { useWorkspaceEditors } from "@/providers/WorkspaceEditorsContext";
import { helferDarkTheme } from "@/lib/blocknote-theme";
import { useCollaborativeDoc } from "@/hooks/use-collaborative-doc";
import { SupabaseYjsProvider } from "@/providers/supabase-yjs-provider";
import { toBase64 } from "@/lib/base64";

const SAVE_DEBOUNCE_MS = 1000;

type DocEditorProps = {
  workspaceId: string;
  initialContent: Block[] | null;
  initialState: string | null;
};

export function DocEditor({
  workspaceId,
  initialContent,
  initialState,
}: DocEditorProps) {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const collab = useCollaborativeDoc(workspaceId, initialState);

  if (!collab || !user) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading document...
      </div>
    );
  }
  if ("error" in collab) {
    return <div role="alert" className="p-6 text-sm text-destructive">{collab.error}</div>;
  }

  return (
    <CollaborativeEditor
      workspaceId={workspaceId}
      initialContent={initialContent}
      doc={collab.doc}
      provider={collab.provider}
      user={{
        name: user.name ?? "Anonymous",
        color: colorForUser(user.id),
      }}
    />
  );
}

// Split out so the editor is only created once the shared doc is ready — BlockNote binds to
// the Yjs fragment at creation time.
function CollaborativeEditor({
  workspaceId,
  initialContent,
  doc,
  provider,
  user,
}: Omit<DocEditorProps, "initialState"> & {
  doc: Y.Doc;
  provider: SupabaseYjsProvider;
  user: { name: string; color: string };
}) {
  const fragment = doc.getXmlFragment("document-store");
  const editor = useCreateBlockNote({
    extensions: [CollaborationExtension({ fragment, user, provider })],
  });

  // Publish the live editor so the Share dialog can export it.
  const { setDocEditor } = useWorkspaceEditors();
  useEffect(() => {
    setDocEditor(editor);
    return () => setDocEditor(null);
  }, [editor, setDocEditor]);

  // Docs saved before collaboration existed only have JSON — import it once into the shared doc.
  useEffect(() => {
    if (fragment.length === 0 && initialContent?.length) {
      editor.replaceBlocks(editor.document, initialContent);
    }
  }, [editor, fragment, initialContent]);

  // Save only our own edits (remote ones are saved by whoever made them). The server merges
  // the state, and also keeps a readable JSON copy for server-side features.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const save = () => {
      timeout = undefined;
      const content = JSON.parse(
        JSON.stringify(editor.document),
      ) as Prisma.InputJsonValue;
      saveDocContent(
        workspaceId,
        toBase64(Y.encodeStateAsUpdate(doc)),
        content,
      );
    };
    const handleUpdate = (_update: Uint8Array, origin: unknown) => {
      if (origin === provider) return;
      clearTimeout(timeout);
      timeout = setTimeout(save, SAVE_DEBOUNCE_MS);
    };

    doc.on("update", handleUpdate);
    return () => {
      doc.off("update", handleUpdate);
      // Flush a pending save rather than dropping the last edits when leaving the page.
      if (timeout) {
        clearTimeout(timeout);
        save();
      }
    };
  }, [doc, editor, provider, workspaceId]);

  return (
    <div className="h-full overflow-y-auto pt-6">
      <BlockNoteView editor={editor} theme={helferDarkTheme} />
    </div>
  );
}
