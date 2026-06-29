"use client";

import { cn } from "@/lib/utils";
import type { ComponentStyleProps } from "@centroimovel/types";
import { AnimatePresence, motion } from "framer-motion";
import { X, ZoomIn } from "lucide-react";
import { useContext, useState } from "react";
import { LightboxPortal } from "./LightboxPortal";
import { SectionSurface } from "./SectionSurface";
import { useBuilderEditorCanvas } from "./builder-editor-canvas-context";
import {
  IMAGE_MAX_WIDTH_DESKTOP,
  IMAGE_MAX_WIDTH_MOBILE,
} from "./image-max-width-classes";
import { PreviewDocumentContext } from "./preview-document-context";
import { withPreviewMotionViewport } from "./preview-motion-viewport";
import { getBorderRadiusValue } from "./style-utils";
import { defaultTextColorForTextBlock } from "./text-block-colors";

interface BuilderImageProps {
  imageUrl?: string | null;
  caption?: string;
  lightboxEnabled?: boolean;
  alignment?: "left" | "center" | "right";
  maxWidthMobile?: string;
  maxWidthDesktop?: string;
  style?: ComponentStyleProps;
}

const alignmentClass = {
  left: "mr-auto",
  center: "mx-auto",
  right: "ml-auto",
};

const textAlignClass = (t?: string) => {
  if (t === "right") return "text-right";
  if (t === "center") return "text-center";
  return "text-left";
};

export function BuilderImage({
  imageUrl,
  caption,
  lightboxEnabled = true,
  alignment = "center",
  maxWidthMobile = "full",
  maxWidthDesktop = "5xl",
  style,
}: BuilderImageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const previewDocument = useContext(PreviewDocumentContext);
  const editorCanvas = useBuilderEditorCanvas();
  const lbBackdrop = editorCanvas ? "z-[40]" : "z-[10000]";
  const lbControls = editorCanvas ? "z-[41]" : "z-[10001]";
  const imageViewport = withPreviewMotionViewport(previewDocument, {
    once: true,
  });

  const mwM =
    IMAGE_MAX_WIDTH_MOBILE[maxWidthMobile] ?? IMAGE_MAX_WIDTH_MOBILE.full;
  const mwD =
    IMAGE_MAX_WIDTH_DESKTOP[maxWidthDesktop] ?? IMAGE_MAX_WIDTH_DESKTOP["5xl"];

  const resolvedTextColor =
    style?.textColor ?? defaultTextColorForTextBlock(style);
  const { textAlign: _ta, ...surfaceStyleRest } = style ?? {};
  const surfaceStyle = surfaceStyleRest as ComponentStyleProps | undefined;
  const imgRadius =
    getBorderRadiusValue(style?.borderRadius as string | undefined) ?? "1.5rem";

  const figureClass = cn(
    "relative w-full group",
    mwM,
    mwD,
    alignmentClass[alignment],
  );

  if (!imageUrl) {
    return (
      <SectionSurface style={surfaceStyle} className="px-6 py-16 md:px-12">
        <div className="mx-auto max-w-2xl text-center opacity-30 py-24 border-2 border-dashed border-white/10 rounded-3xl">
          <p
            className="text-xs font-bold uppercase tracking-[0.2em]"
            style={{ color: resolvedTextColor }}
          >
            Imagem vazia — clique para editar
          </p>
        </div>
      </SectionSurface>
    );
  }

  const ImageComponent = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={imageViewport}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={figureClass}
    >
      <figure className="relative">
        <div
          className="relative overflow-hidden shadow-2xl transition-all duration-700 hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)]"
          style={{ borderRadius: imgRadius }}
        >
          <img
            src={imageUrl}
            alt={caption || ""}
            className="h-auto w-full transition-transform duration-1000 group-hover:scale-105"
          />
          {lightboxEnabled && (
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center cursor-zoom-in">
              <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-500">
                <ZoomIn size={24} />
              </div>
            </div>
          )}
        </div>
        {caption && (
          <figcaption
            className={cn(
              "mt-6 text-sm font-medium opacity-60 tracking-wide",
              textAlignClass(alignment),
            )}
            style={{ color: resolvedTextColor }}
          >
            {caption}
          </figcaption>
        )}
      </figure>
    </motion.div>
  );

  return (
    <SectionSurface style={surfaceStyle} className="px-6 py-16 md:px-12">
      {lightboxEnabled && imageUrl ? (
        <>
          <div onClick={() => setIsOpen(true)}>{ImageComponent}</div>

          <LightboxPortal>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "fixed inset-0 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 md:p-12",
                    lbBackdrop,
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <motion.button
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    type="button"
                    className={cn(
                      "absolute top-8 right-8 rounded-full p-3 text-white/50 hover:text-white hover:bg-white/10 transition-all",
                      lbControls,
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <X size={32} />
                  </motion.button>
                  <motion.img
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    src={imageUrl}
                    alt={caption || ""}
                    className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
                  />
                  {caption && (
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium tracking-wide"
                    >
                      {caption}
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </LightboxPortal>
        </>
      ) : (
        ImageComponent
      )}
    </SectionSurface>
  );
}
