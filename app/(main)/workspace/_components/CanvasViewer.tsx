"use client";

import {
  Tldraw,
  type Editor,
  type TLEditorSnapshot,
} from "tldraw";
import "tldraw/tldraw.css";
import { EntityTableShapeUtil } from "@/components/EntityTable/EntityTableShapeUtil";

const shapeUtils = [EntityTableShapeUtil];

function setReadOnly(editor: Editor) {
  editor.updateInstanceState({ isReadonly: true });
}

export function CanvasViewer({
  snapshot,
}: {
  snapshot: TLEditorSnapshot | null;
}) {
  return (
    <div className="h-full w-full">
      <Tldraw
        snapshot={snapshot ?? undefined}
        onMount={setReadOnly}
        hideUi
        colorScheme="dark"
        shapeUtils={shapeUtils}
        licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY}
      />
    </div>
  );
}
