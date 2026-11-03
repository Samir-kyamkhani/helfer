"use client";

import dynamic from "next/dynamic";

// BlockNote's editor touches `window` during creation, so it can't run during Next's SSR pass.
// ssr: false only works from within a client boundary, hence this thin wrapper module —
// server components (the workspace and shared pages) import from here instead.
export const DocEditor = dynamic(
  () => import("./DocEditor").then((m) => m.DocEditor),
  {
    ssr: false,
  },
);

export const DocViewer = dynamic(
  () => import("./DocViewer").then((m) => m.DocViewer),
  {
    ssr: false,
  },
);
