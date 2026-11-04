"use client";

import { useEffect, useState } from "react";
import * as Y from "yjs";
import { SupabaseYjsProvider } from "@/providers/supabase-yjs-provider";
import { fromBase64 } from "@/lib/base64";
import { createWorkspaceRealtimeClient } from "@/lib/supabase";

// Creates the shared Yjs doc for a workspace and connects it to Realtime. Returns null until
// the provider is ready, so the editor only mounts once it has the saved + peers' latest state.
export function useCollaborativeDoc(
  workspaceId: string,
  initialState: string | null,
) {
  const [collab, setCollab] = useState<{
    workspaceId: string;
    doc: Y.Doc;
    provider: SupabaseYjsProvider;
  } | { workspaceId: string; error: string } | null>(null);
  // Only the first saved state matters — later server refreshes (e.g. after a rename) must not
  // reconnect the editor.
  const [savedState] = useState(initialState);

  useEffect(() => {
    const doc = new Y.Doc();
    if (savedState) Y.applyUpdate(doc, fromBase64(savedState));
    let provider: SupabaseYjsProvider | null = null;
    let cancelled = false;
    try {
      const client = createWorkspaceRealtimeClient(workspaceId);
      provider = new SupabaseYjsProvider(doc, workspaceId, () => {
        if (!cancelled && provider) setCollab({ workspaceId, doc, provider });
      }, client);
    } catch (error) {
      queueMicrotask(() => {
        if (!cancelled) setCollab({ workspaceId, error: error instanceof Error ? error.message : "Collaboration could not connect." });
      });
    }

    return () => {
      cancelled = true;
      provider?.destroy();
      doc.destroy();
    };
  }, [workspaceId, savedState]);

  return collab?.workspaceId === workspaceId ? collab : null;
}
