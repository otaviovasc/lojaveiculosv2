"use client";

import { cn } from "@/lib/utils";
import type { ViewportMode } from "@centroimovel/types";
import { Eye, Loader2, Monitor, Smartphone, Tablet } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

const VIEWPORT_WIDTHS: Record<ViewportMode, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

export interface PreviewFrameHandle {
  postUpdate: (payload: Record<string, unknown>) => void;
}

interface PreviewFrameProps {
  slug: string;
  templateId: string;
  viewportMode: ViewportMode;
  onViewportChange: (mode: ViewportMode) => void;
  config?: Record<string, unknown> | null;
}

export const PreviewFrame = forwardRef<PreviewFrameHandle, PreviewFrameProps>(
  function PreviewFrame(
    { slug, templateId, viewportMode, onViewportChange, config },
    ref,
  ) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [iframeReady, setIframeReady] = useState(false);
    const [iframeSrc, setIframeSrc] = useState("");

    // Compute iframe URL (include template for live theme switching)
    useEffect(() => {
      const url = `/${slug}?editor=1&template=${encodeURIComponent(templateId)}`;
      setIframeSrc(url);
    }, [slug, templateId]);

    const postUpdate = useCallback((payload: Record<string, unknown>) => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      win.postMessage({ type: "editor:update", payload }, "*");
    }, []);

    useImperativeHandle(ref, () => ({ postUpdate }), [postUpdate]);

    const handleIframeLoad = useCallback(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          setIframeReady(true);
          // Sync full config when iframe is ready so any updates sent before
          // the iframe loaded (e.g. new testimonials) are applied
          if (config && Object.keys(config).length > 0) {
            const win = iframeRef.current?.contentWindow;
            if (win) {
              win.postMessage({ type: "editor:update", payload: config }, "*");
            }
          }
        }, 200);
      });
    }, [config]);

    return (
      <div className="flex flex-1 flex-col overflow-hidden bg-muted/30">
        {/* Preview toolbar */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/50 bg-card/80 px-4 py-2 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">
              Pré-visualização ao vivo
            </span>
          </div>

          {/* Viewport switcher */}
          <div className="hidden items-center gap-0.5 rounded-xl bg-muted/60 p-0.5 md:flex">
            {(
              [
                { id: "desktop", icon: Monitor, label: "Desktop" },
                { id: "tablet", icon: Tablet, label: "Tablet" },
                { id: "mobile", icon: Smartphone, label: "Mobile" },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                onClick={() => onViewportChange(v.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all",
                  viewportMode === v.id
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <v.icon className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">{v.label}</span>
              </button>
            ))}
          </div>

          <div className="text-[10px] text-muted-foreground">
            {viewportMode === "desktop" && "Desktop"}
            {viewportMode === "tablet" && "768px"}
            {viewportMode === "mobile" && "375px"}
          </div>
        </div>

        {/* Preview content */}
        <div className="flex flex-1 items-start justify-center overflow-auto p-3 md:p-5">
          <div
            className="relative overflow-hidden rounded-xl bg-card shadow-lg ring-1 ring-border/30 transition-all duration-300"
            style={{
              width: VIEWPORT_WIDTHS[viewportMode],
              maxWidth: "100%",
              height: viewportMode === "desktop" ? "100%" : undefined,
              minHeight: viewportMode !== "desktop" ? "80vh" : undefined,
            }}
          >
            {/* Skeleton loading overlay */}
            <div
              className={cn(
                "absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card transition-opacity duration-300",
                iframeReady ? "pointer-events-none opacity-0" : "opacity-100",
              )}
            >
              <div className="space-y-4 p-6 w-full">
                <div className="h-14 w-full animate-pulse rounded-lg bg-muted" />
                <div className="space-y-3">
                  <div className="h-8 w-3/4 animate-pulse rounded-lg bg-muted" />
                  <div className="h-5 w-1/2 animate-pulse rounded-lg bg-muted" />
                  <div className="h-52 w-full animate-pulse rounded-lg bg-muted" />
                </div>
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Carregando preview...
                  </span>
                </div>
              </div>
            </div>

            {iframeSrc && (
              <iframe
                ref={iframeRef}
                src={iframeSrc}
                onLoad={handleIframeLoad}
                className={cn(
                  "w-full bg-card transition-opacity duration-300",
                  iframeReady ? "opacity-100" : "opacity-0",
                )}
                style={{
                  height: viewportMode === "desktop" ? "100%" : "80vh",
                  minHeight: "600px",
                }}
                title="Pré-visualização"
              />
            )}
          </div>
        </div>
      </div>
    );
  },
);
