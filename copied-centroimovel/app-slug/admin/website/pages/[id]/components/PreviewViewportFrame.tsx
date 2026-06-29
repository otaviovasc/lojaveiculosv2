"use client";

import { cn } from "@/lib/utils";
import { PreviewDocumentContext } from "@/modules/storefront/components/builder/preview-document-context";
import type { ViewportMode } from "@centroimovel/types";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type PreviewViewportMode = ViewportMode;

/**
 * CSS width of the preview shell. The iframe fills this box so layout viewport width matches
 * the selected mode — Tailwind `sm:`/`md:`/`lg:` use this width, not the admin browser.
 */
const PREVIEW_WIDTH_CSS: Record<PreviewViewportMode, string> = {
  desktop: "min(100%, 1400px)",
  tablet: "min(100%, 768px)",
  mobile: "min(100%, 390px)",
};

function collectStylesheetNodes(source: Document): Element[] {
  const fromHead = [
    ...source.head.querySelectorAll('link[rel="stylesheet"], style'),
  ];
  const fromBody = [
    ...(source.body?.querySelectorAll('link[rel="stylesheet"]') ?? []),
  ];
  const seen = new Set<string>();
  const out: Element[] = [];
  for (const el of [...fromHead, ...fromBody]) {
    const key =
      el.tagName === "LINK"
        ? `link:${(el as HTMLLinkElement).href}`
        : `style:${(el as HTMLStyleElement).innerHTML?.slice(0, 48) ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(el);
  }
  return out;
}

function syncRootAttributes(source: Document, target: Document) {
  const s = source.documentElement;
  const t = target.documentElement;
  t.className = s.className;
  t.style.cssText = s.style.cssText;
  const dataTheme = s.getAttribute("data-theme");
  if (dataTheme) t.setAttribute("data-theme", dataTheme);
  else t.removeAttribute("data-theme");
}

function syncDocumentStyles(source: Document, target: Document) {
  const targetHead = target.head;
  targetHead
    .querySelectorAll("[data-preview-style-sync]")
    .forEach((el) => el.remove());

  for (const node of collectStylesheetNodes(source)) {
    if (node.tagName === "LINK") {
      const src = node as HTMLLinkElement;
      const link = target.createElement("link");
      link.rel = "stylesheet";
      link.href = src.href;
      if (src.media) link.media = src.media;
      link.setAttribute("data-preview-style-sync", "");
      targetHead.appendChild(link);
    } else {
      const copy = node.cloneNode(true) as HTMLStyleElement;
      copy.setAttribute("data-preview-style-sync", "");
      targetHead.appendChild(copy);
    }
  }
}

export function PreviewViewportFrame({
  mode,
  className,
  children,
}: {
  mode: PreviewViewportMode;
  className?: string;
  children: ReactNode;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useLayoutEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(
      `<!DOCTYPE html><html style="height:100%" class="bg-background"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body style="margin:0;height:100%;overflow:auto" class="min-h-full bg-background text-foreground antialiased"><div id="preview-root" class="min-h-full w-full"></div></body></html>`,
    );
    doc.close();

    const root = doc.getElementById("preview-root");
    if (!root) return;

    const runSync = () => {
      syncRootAttributes(document, doc);
      syncDocumentStyles(document, doc);
    };
    runSync();

    const scheduleSync = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(runSync, 50);
    };

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.head, { childList: true, subtree: true });
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });

    setPreviewDocument(doc);
    setMountNode(root);

    return () => {
      clearTimeout(debounceRef.current);
      observer.disconnect();
      setMountNode(null);
      setPreviewDocument(null);
    };
  }, []);

  return (
    <PreviewDocumentContext.Provider value={previewDocument}>
      <div
        className={cn(
          "flex h-full min-h-0 w-full flex-1 flex-col items-center",
          className,
        )}
      >
        <div
          className="relative flex h-full min-h-0 w-full max-w-full flex-1 flex-col shadow-lg transition-[width] duration-200"
          style={{ width: PREVIEW_WIDTH_CSS[mode] }}
        >
          <iframe
            ref={iframeRef}
            title="Pré-visualização da página"
            src="about:blank"
            className="block h-full min-h-0 w-full flex-1 border-0 bg-background"
          />
          {mountNode ? createPortal(children, mountNode) : null}
        </div>
      </div>
    </PreviewDocumentContext.Provider>
  );
}
