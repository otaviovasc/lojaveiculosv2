import { Eye, Loader2, Monitor, Smartphone, Tablet } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import type {
  WebsiteBuilderConfig,
  WebsiteBuilderViewportMode,
} from "./WebsiteBuilderTypes";

const viewportWidths: Record<WebsiteBuilderViewportMode, string> = {
  desktop: "100%",
  mobile: "375px",
  tablet: "768px",
};

export type WebsiteBuilderPreviewFrameHandle = {
  postUpdate: (payload: Record<string, unknown>) => void;
};

export const WebsiteBuilderPreviewFrame = forwardRef<
  WebsiteBuilderPreviewFrameHandle,
  {
    config: WebsiteBuilderConfig;
    onViewportChange: (mode: WebsiteBuilderViewportMode) => void;
    slug: string;
    templateId: string;
    viewportMode: WebsiteBuilderViewportMode;
  }
>(function WebsiteBuilderPreviewFrame(
  { config, onViewportChange, slug, templateId, viewportMode },
  ref,
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [iframeSrc, setIframeSrc] = useState("");

  useEffect(() => {
    setIframeReady(false);
    setIframeSrc(
      `/${slug}?editor=1&template=${encodeURIComponent(templateId)}`,
    );
  }, [slug, templateId]);

  const postUpdate = useCallback((payload: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(
      { payload, type: "editor:update" },
      "*",
    );
  }, []);

  useEffect(() => {
    if (!iframeSrc) return undefined;

    const fallbackId = window.setTimeout(() => {
      setIframeReady(true);
      postUpdate(config as unknown as Record<string, unknown>);
    }, 1800);

    return () => window.clearTimeout(fallbackId);
  }, [config, iframeSrc, postUpdate]);

  useImperativeHandle(ref, () => ({ postUpdate }), [postUpdate]);

  const handleIframeLoad = useCallback(() => {
    window.setTimeout(() => {
      setIframeReady(true);
      postUpdate(config as unknown as Record<string, unknown>);
    }, 200);
  }, [config, postUpdate]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-muted/30">
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 bg-card/80 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            Pre-visualizacao ao vivo
          </span>
        </div>

        <div className="hidden items-center gap-0.5 rounded-xl bg-muted/60 p-0.5 md:flex">
          {[
            { icon: Monitor, id: "desktop", label: "Desktop" },
            { icon: Tablet, id: "tablet", label: "Tablet" },
            { icon: Smartphone, id: "mobile", label: "Mobile" },
          ].map((item) => {
            const Icon = item.icon;
            const id = item.id as WebsiteBuilderViewportMode;
            return (
              <button
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all",
                  viewportMode === id
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground",
                )}
                key={item.id}
                onClick={() => onViewportChange(id)}
                type="button"
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="text-[10px] text-muted-foreground">
          {viewportMode === "desktop" ? "Desktop" : null}
          {viewportMode === "tablet" ? "768px" : null}
          {viewportMode === "mobile" ? "375px" : null}
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center overflow-auto p-3 md:p-5">
        <div
          className="relative overflow-hidden rounded-xl bg-card shadow-lg ring-1 ring-border/30 transition-all duration-300"
          style={{
            height: viewportMode === "desktop" ? "100%" : undefined,
            maxWidth: "100%",
            minHeight: viewportMode !== "desktop" ? "80vh" : undefined,
            width: viewportWidths[viewportMode],
          }}
        >
          {iframeReady ? null : (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card transition-opacity duration-300">
              <div className="w-full space-y-4 p-6">
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
          )}

          {iframeSrc ? (
            <iframe
              className="w-full bg-card"
              onLoad={handleIframeLoad}
              ref={iframeRef}
              src={iframeSrc}
              style={{
                height: viewportMode === "desktop" ? "100%" : "80vh",
                minHeight: "600px",
              }}
              title="Pre-visualizacao"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
});
