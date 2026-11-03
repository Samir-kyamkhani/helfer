"use client";

import dynamic from "next/dynamic";

export const CanvasViewer = dynamic(
  () => import("./CanvasViewer").then((module) => module.CanvasViewer),
  { ssr: false },
);
