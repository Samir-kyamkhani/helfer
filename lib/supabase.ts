"use client";

import { createClient } from "@supabase/supabase-js";

export function createWorkspaceRealtimeClient(workspaceId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error("Supabase Realtime is not configured.");

  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    accessToken: async () => {
      const response = await fetch(`/api/realtime/workspaces/${encodeURIComponent(workspaceId)}/token`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(response.status === 503 ? "Secure workspace collaboration is not configured." : "Workspace access was denied.");
      const result = await response.json() as { token: string };
      return result.token;
    },
  });
}
