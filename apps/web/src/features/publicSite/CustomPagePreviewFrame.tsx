import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { BuilderViewportMode } from "./CustomPageEditorChrome";

const PREVIEW_WIDTH: Record<BuilderViewportMode, string> = {
  desktop: "min(100%, 1400px)",
  mobile: "min(100%, 390px)",
  tablet: "min(100%, 768px)",
};

const PREVIEW_SIZE_LABEL: Record<BuilderViewportMode, string> = {
  desktop: "1400px canvas",
  mobile: "390px mobile",
  tablet: "768px tablet",
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
  targetRoot.className = sourceRoot.className.replace(/\bdark\b/g, "");
  targetRoot.style.cssText = sourceRoot.style.cssText;
  targetRoot.setAttribute("data-theme", "light");
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
  onSelectBlock,
}: {
  children: ReactNode;
  className?: string;
  mode: BuilderViewportMode;
  onSelectBlock?: (componentId: string) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const onSelectBlockRef = useRef(onSelectBlock);

  useLayoutEffect(() => {
    onSelectBlockRef.current = onSelectBlock;
  }, [onSelectBlock]);

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

    const selectBlock = (event: Event) => {
      const target = event.target;
      if (!target || typeof (target as Element).closest !== "function") {
        return;
      }

      if (event.type === "keydown") {
        const key = (event as KeyboardEvent).key;
        if (key !== "Enter" && key !== " ") return;
      }

      const block = (target as Element).closest<HTMLElement>(
        "[data-builder-block-id]",
      );
      const componentId = block?.getAttribute("data-builder-block-id");
      const onSelect = onSelectBlockRef.current;
      if (!componentId || !onSelect) return;

      event.preventDefault();
      event.stopPropagation();
      onSelect(componentId);
    };

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
    doc.addEventListener("click", selectBlock, true);
    doc.addEventListener("keydown", selectBlock, true);

    return () => {
      clearTimeout(syncTimer.current);
      observer.disconnect();
      doc.removeEventListener("click", selectBlock, true);
      doc.removeEventListener("keydown", selectBlock, true);
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
        className="relative flex h-full min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg transition-[width,box-shadow] duration-300 ease-out"
        style={{ width: PREVIEW_WIDTH[mode] }}
      >
        <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full border border-border/70 bg-card/90 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground shadow-sm backdrop-blur">
          {PREVIEW_SIZE_LABEL[mode]}
        </div>
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
