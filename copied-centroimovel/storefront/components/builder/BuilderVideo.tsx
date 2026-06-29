"use client";

import type { ComponentStyleProps } from "@centroimovel/types";
import { motion } from "framer-motion";
import { useContext } from "react";
import { PreviewDocumentContext } from "./preview-document-context";
import { withPreviewMotionViewport } from "./preview-motion-viewport";
import { SectionSurface } from "./SectionSurface";
import { getBorderRadiusValue } from "./style-utils";
import { defaultTextColorForTextBlock } from "./text-block-colors";

interface BuilderVideoProps {
  videoUrl?: string;
  provider?: "youtube" | "vimeo" | "upload";
  thumbnailUrl?: string | null;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  style?: ComponentStyleProps;
}

function getYoutubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
  );
  return match ? (match[1] ?? null) : null;
}

function getVimeoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
  return match ? (match[1] ?? null) : null;
}

function detectProvider(url: string): "youtube" | "vimeo" | "upload" {
  if (!url) return "youtube";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("vimeo.com")) return "vimeo";
  return "upload";
}

export function BuilderVideo({
  videoUrl = "",
  provider: initialProvider,
  thumbnailUrl,
  autoplay = false,
  loop = false,
  muted = true,
  style,
}: BuilderVideoProps) {
  const previewDocument = useContext(PreviewDocumentContext);
  const videoViewport = withPreviewMotionViewport(previewDocument, {
    once: true,
  });
  const provider = initialProvider || detectProvider(videoUrl);
  const resolvedTextColor =
    style?.textColor ?? defaultTextColorForTextBlock(style);
  const borderRadius =
    getBorderRadiusValue(style?.borderRadius as string | undefined) ?? "2rem";

  if (!videoUrl) {
    return (
      <SectionSurface style={style} className="px-6 py-16 md:px-12">
        <div className="mx-auto max-w-4xl text-center opacity-30 py-24 border-2 border-dashed border-white/10 rounded-[2rem]">
          <p
            className="text-xs font-bold uppercase tracking-[0.2em]"
            style={{ color: resolvedTextColor }}
          >
            Vídeo não configurado — clique para adicionar
          </p>
        </div>
      </SectionSurface>
    );
  }

  const renderVideo = () => {
    // YouTube embed
    if (provider === "youtube") {
      const videoId = getYoutubeId(videoUrl);
      if (!videoId) {
        return (
          <div className="mx-auto text-center text-red-500 py-16">
            <p className="text-sm font-bold uppercase tracking-widest">
              URL do YouTube inválida
            </p>
          </div>
        );
      }

      const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${
        autoplay ? 1 : 0
      }&loop=${loop ? 1 : 0}&playlist=${videoId}&mute=${muted ? 1 : 0}&rel=0`;

      return (
        <iframe
          src={embedUrl}
          title="YouTube video"
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }

    // Vimeo embed
    if (provider === "vimeo") {
      const videoId = getVimeoId(videoUrl);
      if (!videoId) {
        return (
          <div className="mx-auto text-center text-red-500 py-16">
            <p className="text-sm font-bold uppercase tracking-widest">
              URL do Vimeo inválida
            </p>
          </div>
        );
      }

      const embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=${
        autoplay ? 1 : 0
      }&loop=${loop ? 1 : 0}&muted=${muted ? 1 : 0}`;

      return (
        <iframe
          src={embedUrl}
          title="Vimeo video"
          className="absolute inset-0 w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      );
    }

    // Direct video upload
    return (
      <video
        src={videoUrl}
        poster={thumbnailUrl || undefined}
        controls
        autoPlay={autoplay}
        loop={loop}
        muted={muted}
        className="w-full h-full object-cover"
      />
    );
  };

  return (
    <SectionSurface style={style} className="px-6 py-16 md:px-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={videoViewport}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-5xl"
      >
        <div
          className="relative aspect-video overflow-hidden shadow-2xl transition-all duration-700 hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] border border-white/10"
          style={{ borderRadius }}
        >
          {renderVideo()}
        </div>
      </motion.div>
    </SectionSurface>
  );
}
