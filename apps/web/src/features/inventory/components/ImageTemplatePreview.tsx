import { Check, ImageOff, Loader2, Smartphone } from "lucide-react";
import { useEffect, type RefObject } from "react";
import {
  IMAGE_TEMPLATE_WIDTH,
  type FormatType,
  getImageTemplateHeight,
  type ImageTemplateMedia,
} from "./ImageTemplateTypes";

export function ImageTemplatePreview({
  canvasRef,
  containerRef,
  format,
  generating,
  listingTitle,
  media,
  onCanvasReady,
  previewScale,
  renderError,
  selectedPhotoIndex,
  setSelectedPhotoIndex,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  format: FormatType;
  generating: boolean;
  listingTitle: string;
  media: ImageTemplateMedia[];
  onCanvasReady: () => void;
  previewScale: number;
  renderError?: string | null;
  selectedPhotoIndex: number;
  setSelectedPhotoIndex: (index: number) => void;
}) {
  const previewW = IMAGE_TEMPLATE_WIDTH * previewScale;
  const height = getImageTemplateHeight(format);
  const previewH = height * previewScale;

  useEffect(() => {
    if (canvasRef.current) onCanvasReady();
  }, [canvasRef, onCanvasReady]);

  return (
    <section
      aria-label="Prévia do post"
      className="relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-app"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line/30 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-accent-text">
            <Smartphone aria-hidden="true" className="size-4" />
            Prévia em tempo real
          </span>
          <p className="mt-1 truncate text-xs font-bold text-muted">
            {listingTitle}
          </p>
        </div>
        <span className="shrink-0 rounded-lg border border-line bg-panel px-2.5 py-1 text-xs font-black text-app-text tabular-nums">
          {format === "feed" ? "Feed 1:1" : "Stories 9:16"}
        </span>
      </header>
      <div
        ref={containerRef}
        className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-6"
      >
        {media.length === 0 ? (
          <div className="mx-auto max-w-sm rounded-2xl border border-dashed border-line bg-panel/70 p-6 text-center shadow-sm">
            <span className="mx-auto grid size-12 place-items-center rounded-xl bg-app-elevated text-muted">
              <ImageOff aria-hidden="true" className="size-6" />
            </span>
            <h3 className="mt-4 text-base font-black text-app-text">
              Adicione uma foto para criar o post
            </h3>
            <p className="mt-2 text-sm font-bold leading-relaxed text-muted">
              Abra o workspace do veículo e envie ao menos uma foto. Vídeos e
              documentos não entram no post.
            </p>
          </div>
        ) : (
          <div
            className="relative overflow-hidden rounded-2xl border border-line/40 bg-panel shadow-2xl transition-[width,height] duration-200"
            style={{ width: previewW, height: previewH }}
          >
            {generating ? (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/35 backdrop-blur-sm"
                role="status"
              >
                <Loader2
                  aria-hidden="true"
                  className="size-8 animate-spin text-white"
                />
                <span className="sr-only">Atualizando prévia</span>
              </div>
            ) : null}
            {renderError ? (
              <div className="absolute inset-x-3 bottom-3 z-20 rounded-xl border border-danger/30 bg-panel p-3 text-center text-xs font-bold text-danger shadow-lg">
                {renderError}
              </div>
            ) : null}
            <canvas
              className="origin-top-left"
              data-testid="post-studio-canvas"
              ref={canvasRef}
              style={{
                transform: `scale(${previewScale})`,
                width: IMAGE_TEMPLATE_WIDTH,
                height,
              }}
            />
          </div>
        )}
      </div>
      {media.length > 1 ? (
        <div
          aria-label="Fotos do veículo"
          className="flex items-center gap-2 overflow-x-auto border-t border-line/30 px-4 py-3"
          role="group"
        >
          <span className="mr-1 shrink-0 text-xs font-black text-muted">
            Foto {selectedPhotoIndex + 1} de {media.length}
          </span>
          {media.map((item, idx) => {
            const className = [
              "relative size-14 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 outline-none transition-[border-color,opacity,transform] duration-200 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app",
              selectedPhotoIndex === idx
                ? "scale-105 border-accent"
                : "border-line opacity-60 hover:border-line-strong hover:opacity-100",
            ].join(" ");
            return (
              <button
                aria-label={`Usar foto ${idx + 1} de ${listingTitle}`}
                aria-pressed={selectedPhotoIndex === idx}
                className={className}
                key={item.id}
                onClick={() => setSelectedPhotoIndex(idx)}
                type="button"
              >
                <img
                  alt={item.altText ?? `Foto ${idx + 1} de ${listingTitle}`}
                  className="size-full object-cover"
                  src={item.url}
                />
                {selectedPhotoIndex === idx ? (
                  <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-md bg-accent text-accent-foreground">
                    <Check aria-hidden="true" className="size-3.5" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
