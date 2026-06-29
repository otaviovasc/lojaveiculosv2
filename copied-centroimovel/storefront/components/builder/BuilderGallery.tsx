"use client";

import { cn } from "@/lib/utils";
import type { ComponentStyleProps, StoreConfig } from "@centroimovel/types";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import Link from "next/link";
import { useContext, useState } from "react";
import {
  auroraFadeIn,
  auroraStagger,
} from "../../templates/aurora/aurora-variants";
import { useBuilderEditorCanvas } from "./builder-editor-canvas-context";
import { LightboxPortal } from "./LightboxPortal";
import { PreviewDocumentContext } from "./preview-document-context";
import { withPreviewMotionViewport } from "./preview-motion-viewport";
import { SectionSurface } from "./SectionSurface";
import { formatCssFontStack, getBorderRadiusValue } from "./style-utils";
import { defaultTextColorForTextBlock } from "./text-block-colors";

interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
  alt?: string;
  linkUrl?: string;
  linkType?: "internal" | "external";
  colSpan?: number;
  rowSpan?: number;
  aspectRatio?: "auto" | "square" | "video" | "portrait" | "wide";
}

interface BuilderGalleryProps {
  title?: string;
  subtitle?: string;
  images?: GalleryImage[];
  layout?: "grid" | "mosaic" | "masonry" | "carousel";
  columns?: number;
  gap?: "none" | "sm" | "md" | "lg" | "xl";
  lightboxEnabled?: boolean;
  showCaptions?: boolean;
  style?: ComponentStyleProps;
  config: StoreConfig;
}

const gapMap = {
  none: "gap-0",
  sm: "gap-2 md:gap-4",
  md: "gap-4 md:gap-6",
  lg: "gap-6 md:gap-8",
  xl: "gap-8 md:gap-12",
};

const aspectMap = {
  auto: "",
  square: "aspect-square",
  video: "aspect-video",
  portrait: "aspect-3/4",
  wide: "aspect-21/9",
};

export function BuilderGallery({
  title,
  subtitle,
  images = [],
  layout = "grid",
  columns = 3,
  gap = "md",
  lightboxEnabled = true,
  showCaptions = false,
  style,
  config,
}: BuilderGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null,
  );
  const previewDocument = useContext(PreviewDocumentContext);
  const editorCanvas = useBuilderEditorCanvas();
  const lbBackdrop = editorCanvas ? "z-[40]" : "z-[10000]";
  const lbControls = editorCanvas ? "z-[41]" : "z-[10001]";
  const galleryViewportHeader = withPreviewMotionViewport(previewDocument, {
    once: true,
    amount: 0.2,
  });
  const galleryViewportGrid = withPreviewMotionViewport(previewDocument, {
    once: true,
    amount: 0.1,
  });

  const resolvedTextColor =
    style?.textColor || defaultTextColorForTextBlock(style);
  const accentColor = config.accentColor || "#C9A84C";
  const headingFont = formatCssFontStack(
    style?.fontFamily || config.fonts?.heading,
  );
  const bodyFont = formatCssFontStack(style?.fontFamily || config.fonts?.body);
  const borderRadius =
    getBorderRadiusValue(style?.borderRadius as string | undefined) ?? "2rem";
  const itemRadius =
    getBorderRadiusValue(style?.borderRadius as string | undefined) ?? "1.5rem";

  if (images.length === 0) {
    return (
      <SectionSurface style={style} className="px-6 py-16 md:px-12">
        <div className="mx-auto max-w-4xl text-center opacity-30 py-24 border-2 border-dashed border-white/10 rounded-[2rem]">
          <p
            className="text-xs font-bold uppercase tracking-[0.2em]"
            style={{ color: resolvedTextColor }}
          >
            Galeria vazia — clique para adicionar imagens
          </p>
        </div>
      </SectionSurface>
    );
  }

  const renderImage = (image: GalleryImage, index: number) => {
    const isLink = !!image.linkUrl;

    const content = (
      <motion.div
        variants={auroraFadeIn("up")}
        className={cn(
          "group relative overflow-hidden shadow-lg transition-all duration-700 hover:shadow-2xl",
          layout === "mosaic" && {
            "md:col-span-2": image.colSpan === 2,
            "md:col-span-3": image.colSpan === 3,
            "md:row-span-2": image.rowSpan === 2,
          },
          (layout !== "masonry" && aspectMap[image.aspectRatio || "auto"]) ||
            (layout === "grid" ? aspectMap.square : ""),
          "bg-stone-100/50",
        )}
        style={{ borderRadius: itemRadius }}
      >
        <img
          src={image.url || undefined}
          alt={image.alt || image.caption || ""}
          className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
        />

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col items-center justify-center p-6 text-center">
          {lightboxEnabled && !isLink && (
            <div
              className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white mb-4 scale-75 group-hover:scale-100 transition-transform duration-500 cursor-zoom-in"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImageIndex(index);
              }}
            >
              <ZoomIn size={20} />
            </div>
          )}

          {isLink && (
            <div className="h-12 w-12 rounded-full bg-white text-black flex items-center justify-center mb-4 scale-75 group-hover:scale-100 transition-transform duration-500">
              <ArrowRight size={20} />
            </div>
          )}

          {(showCaptions || image.caption) && (
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              whileHover={{ y: 0, opacity: 1 }}
              className="text-white text-sm font-medium tracking-wide line-clamp-2"
            >
              {image.caption}
            </motion.p>
          )}
        </div>
      </motion.div>
    );

    if (isLink) {
      if (image.linkType === "internal") {
        return (
          <Link key={image.id} href={image.linkUrl!}>
            {content}
          </Link>
        );
      }
      return (
        <a
          key={image.id}
          href={image.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {content}
        </a>
      );
    }

    return (
      <div
        key={image.id}
        onClick={() => lightboxEnabled && setSelectedImageIndex(index)}
        className={lightboxEnabled ? "cursor-zoom-in" : ""}
      >
        {content}
      </div>
    );
  };

  return (
    <SectionSurface style={style} className="px-6 py-24 md:py-32 md:px-12">
      <div className="mx-auto max-w-[1600px]">
        {(title || subtitle) && (
          <motion.div
            variants={auroraStagger(0.1, 0)}
            initial="hidden"
            whileInView="show"
            viewport={galleryViewportHeader}
            className="mb-20 text-center max-w-3xl mx-auto space-y-6"
          >
            {subtitle && (
              <motion.span
                variants={auroraFadeIn("up")}
                className="text-xs font-bold uppercase tracking-[0.3em] block"
                style={{ color: accentColor }}
              >
                {subtitle}
              </motion.span>
            )}
            {title && (
              <motion.h2
                variants={auroraFadeIn("up", 0.1)}
                className="text-4xl md:text-6xl font-bold leading-tight tracking-tight"
                style={{
                  color: resolvedTextColor,
                  fontFamily: headingFont,
                }}
              >
                {title}
              </motion.h2>
            )}
          </motion.div>
        )}

        <motion.div
          variants={auroraStagger(0.05, 0.1)}
          initial="hidden"
          whileInView="show"
          viewport={galleryViewportGrid}
          className={cn(
            layout === "carousel"
              ? "flex w-full overflow-x-auto pb-12 snap-x snap-mandatory scrollbar-hide"
              : "grid w-full",
            gapMap[gap],
            layout === "grid" && {
              "grid-cols-1 sm:grid-cols-2": columns === 2,
              "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3": columns === 3,
              "grid-cols-2 lg:grid-cols-4": columns === 4,
              "grid-cols-2 md:grid-cols-3 lg:grid-cols-5": columns === 5,
              "grid-cols-2 md:grid-cols-3 lg:grid-cols-6": columns === 6,
            },
            layout === "mosaic" &&
              "grid-cols-2 md:grid-cols-4 auto-rows-[200px] md:auto-rows-[300px]",
            layout === "masonry" &&
              "columns-1 sm:columns-2 lg:columns-3 xl:columns-4 space-y-4 md:space-y-6",
          )}
        >
          {images.map((image, index) => renderImage(image, index))}
        </motion.div>
      </div>

      <LightboxPortal>
        <AnimatePresence>
          {selectedImageIndex !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "fixed inset-0 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 md:p-12",
                lbBackdrop,
              )}
              onClick={() => setSelectedImageIndex(null)}
            >
              <motion.button
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                type="button"
                className={cn(
                  "absolute top-8 right-8 rounded-full p-3 text-white/50 hover:text-white hover:bg-white/10 transition-all",
                  lbControls,
                )}
                onClick={() => setSelectedImageIndex(null)}
              >
                <X size={32} />
              </motion.button>

              <div
                className="relative flex h-full w-full items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      className={cn(
                        "absolute left-4 p-4 text-white/50 transition-all hover:text-white md:left-8",
                        lbControls,
                      )}
                      onClick={() =>
                        setSelectedImageIndex(
                          (prev) => (prev! - 1 + images.length) % images.length,
                        )
                      }
                    >
                      <ChevronLeft size={48} />
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "absolute right-4 p-4 text-white/50 transition-all hover:text-white md:right-8",
                        lbControls,
                      )}
                      onClick={() =>
                        setSelectedImageIndex(
                          (prev) => (prev! + 1) % images.length,
                        )
                      }
                    >
                      <ChevronRight size={48} />
                    </button>
                  </>
                )}

                <div className="max-w-full max-h-full flex flex-col items-center">
                  {images[selectedImageIndex] && (
                    <>
                      <motion.img
                        key={images[selectedImageIndex].id}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{
                          type: "spring",
                          damping: 25,
                          stiffness: 200,
                        }}
                        src={images[selectedImageIndex]?.url || undefined}
                        alt={images[selectedImageIndex].alt || ""}
                        className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl"
                      />
                      {images[selectedImageIndex].caption && (
                        <motion.p
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-8 text-white/80 text-lg font-medium tracking-wide text-center max-w-2xl"
                        >
                          {images[selectedImageIndex].caption}
                        </motion.p>
                      )}
                    </>
                  )}
                  <p className="mt-4 text-white/40 text-xs font-bold uppercase tracking-widest">
                    {selectedImageIndex + 1} / {images.length}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </LightboxPortal>
    </SectionSurface>
  );
}
