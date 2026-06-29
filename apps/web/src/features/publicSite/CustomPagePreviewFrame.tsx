import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { BuilderViewportMode } from "./CustomPageEditorChrome";

const PREVIEW_WIDTH: Record<BuilderViewportMode, string> = {
  desktop: "min(100%, 1400px)",
  mobile: "min(100%, 390px)",
  tablet: "min(100%, 768px)",
};

function collectPreviewStyles(source: Document) {
  const nodes = [
    ...source.head.querySelectorAll('link[rel="stylesheet"], style'),
    ...(source.body?.querySelectorAll('link[rel="stylesheet"]') ?? []),
  ];
  const seen = new Set<string>();
  return nodes.filter((node) => {
    const key =
      node.tagName === "LINK"
        ? `link:${(node as HTMLLinkElement).href}`
        : `style:${(node as HTMLStyleElement).innerHTML.slice(0, 80)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function syncRootAttributes(source: Document, target: Document) {
  const sourceRoot = source.documentElement;
  const targetRoot = target.documentElement;
  targetRoot.className = sourceRoot.className;
  targetRoot.style.cssText = sourceRoot.style.cssText;
  const theme = sourceRoot.getAttribute("data-theme");
  if (theme) {
    targetRoot.setAttribute("data-theme", theme);
  } else {
    targetRoot.removeAttribute("data-theme");
  }
}

function syncPreviewStyles(source: Document, target: Document) {
  target.head
    .querySelectorAll("[data-builder-preview-style]")
    .forEach((node) => node.remove());

  for (const node of collectPreviewStyles(source)) {
    if (node.tagName === "LINK") {
      const original = node as HTMLLinkElement;
      const link = target.createElement("link");
      link.rel = "stylesheet";
      link.href = original.href;
      if (original.media) link.media = original.media;
      link.setAttribute("data-builder-preview-style", "");
      target.head.appendChild(link);
    } else {
      const copy = node.cloneNode(true) as HTMLStyleElement;
      copy.setAttribute("data-builder-preview-style", "");
      target.head.appendChild(copy);
    }
  }
}

export function CustomPagePreviewFrame({
  children,
  className,
  mode,
}: {
  children: ReactNode;
  className?: string;
  mode: BuilderViewportMode;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useLayoutEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return undefined;

    doc.open();
    doc.write(
      '<!DOCTYPE html><html style="height:100%"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body class="min-h-full bg-background text-foreground antialiased" style="margin:0;height:100%;overflow:auto"><div id="preview-root" class="min-h-full w-full"></div></body></html>',
    );
    doc.close();

    const root = doc.getElementById("preview-root");
    if (!root) return undefined;

    const sync = () => {
      syncRootAttributes(document, doc);
      syncPreviewStyles(document, doc);
    };
    const scheduleSync = () => {
      clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(sync, 50);
    };

    sync();
    setMountNode(root);

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.head, { childList: true, subtree: true });
    observer.observe(document.documentElement, {
      attributeFilter: ["class", "data-theme", "style"],
      attributes: true,
    });

    return () => {
      clearTimeout(syncTimer.current);
      observer.disconnect();
      setMountNode(null);
    };
  }, []);

  return (
    <div
      className={cn(
        "flex h-full min-h-[640px] w-full flex-1 flex-col items-center",
        className,
      )}
    >
      <div
        className="relative flex h-full min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg transition-[width]"
        style={{ width: PREVIEW_WIDTH[mode] }}
      >
        <iframe
          className="block h-full min-h-0 w-full flex-1 border-0 bg-background"
          ref={iframeRef}
          src="about:blank"
          title="Pre-visualizacao da pagina"
        />
        {mountNode ? createPortal(children, mountNode) : null}
      </div>
    </div>
  );
}
