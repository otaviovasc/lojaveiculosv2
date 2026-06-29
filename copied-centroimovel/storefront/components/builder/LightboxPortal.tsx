"use client";

import { useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBuilderEditorCanvas } from "./builder-editor-canvas-context";
import { PreviewDocumentContext } from "./preview-document-context";

/**
 * Renders children into `document.body` so `fixed` lightboxes are not clipped by section `overflow-hidden`.
 * In the admin page builder, mounts into `#preview-root` so block toolbars (higher z-index) can sit above the overlay.
 */
export function LightboxPortal({ children }: { children: ReactNode }) {
  const previewDocument = useContext(PreviewDocumentContext);
  const editorCanvas = useBuilderEditorCanvas();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === "undefined") return null;
  const previewRoot =
    previewDocument?.getElementById("preview-root") ??
    document.getElementById("preview-root");
  const target =
    editorCanvas && previewRoot
      ? previewRoot
      : (previewDocument?.body ?? document.body);
  return createPortal(children, target);
}
