import { Loader2, Smartphone } from "lucide-react";
import type { RefObject } from "react";
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
  media,
  previewScale,
  selectedPhotoIndex,
  setSelectedPhotoIndex,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  format: FormatType;
  generating: boolean;
  media: ImageTemplateMedia[];
  previewScale: number;
  selectedPhotoIndex: number;
  setSelectedPhotoIndex: (index: number) => void;
}) {
  const previewW = IMAGE_TEMPLATE_WIDTH * previewScale;
  const height = getImageTemplateHeight(format);
  const previewH = height * previewScale;

  return (
    <div className="flex-grow bg-app flex flex-col relative overflow-hidden">
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <span className="bg-panel border border-line px-3 py-1.5 rounded-full text-xs font-black text-app-text shadow-sm flex items-center gap-1.5">
          <Smartphone className="w-4 h-4 text-accent-strong" />
          Instagram Template
        </span>
      </div>
      <div
        ref={containerRef}
        className="flex-grow flex items-center justify-center p-4 sm:p-8 min-h-[350px]"
      >
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl transition-all"
          style={{ width: previewW, height: previewH }}
        >
          {generating && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-10">
              <Loader2 className="size-8 text-white animate-spin" />
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="transform origin-top-left shadow-lg"
            style={{
              transform: `scale(${previewScale})`,
              width: IMAGE_TEMPLATE_WIDTH,
              height,
            }}
          />
        </div>
      </div>
      {media.length > 1 && (
        <div className="px-4 pb-4 flex gap-2 overflow-x-auto items-center">
          {media.map((item, idx) => {
            const className = [
              "shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all",
              selectedPhotoIndex === idx
                ? "border-accent shadow-md scale-105"
                : "border-transparent opacity-60 hover:opacity-100",
            ].join(" ");
            return (
              <button
                key={item.id}
                onClick={() => setSelectedPhotoIndex(idx)}
                className={className}
              >
                <img
                  src={item.url}
                  alt={`Mídia ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
