import { notFound } from "next/navigation";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Block } from "@blocknote/core";
import type { TLEditorSnapshot } from "tldraw";
import { prisma } from "@/lib/prisma";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { DocViewer } from "@/app/(main)/workspace/_components/DocEditorLoader";
import { CanvasViewer } from "@/app/(main)/workspace/_components/CanvasViewerLoader";

async function SharedWorkspace({
  params,
}: PageProps<"/shared/[token]">) {
  const { token } = await params;
  const workspace = await prisma.workspace.findUnique({
    where: { shareToken: token },
    select: {
      name: true,
      doc: { select: { content: true } },
      canvas: { select: { content: true } },
    },
  });

  if (!workspace) notFound();

  const docContent = (workspace.doc?.content ??
    null) as unknown as Block[] | null;
  const canvasSnapshot = (workspace.canvas?.content ??
    null) as unknown as TLEditorSnapshot | null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/6 bg-background px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/mascot-dark.png"
            alt="Helfer"
            width={24}
            height={24}
            className="size-6"
          />
          <span className="font-medium">{workspace.name}</span>
        </Link>
        <span className="text-xs text-muted-foreground">
          Read-only shared workspace
        </span>
      </header>

      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        <ResizablePanel defaultSize={40} minSize={25}>
          <section className="flex h-full min-h-0 flex-col">
            <h2 className="shrink-0 border-b border-white/6 px-4 py-3 text-sm font-medium">
              Document
            </h2>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <DocViewer content={docContent} />
            </div>
          </section>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={60} minSize={25}>
          <section className="flex h-full min-h-0 flex-col">
            <h2 className="shrink-0 border-b border-white/6 px-4 py-3 text-sm font-medium">
              Canvas
            </h2>
            <div className="min-h-0 flex-1">
              <CanvasViewer snapshot={canvasSnapshot} />
            </div>
          </section>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default function SharedPage(props: PageProps<"/shared/[token]">) {
  return (
    <React.Suspense fallback={<div className="h-dvh bg-background" />}>
      <SharedWorkspace {...props} />
    </React.Suspense>
  );
}
