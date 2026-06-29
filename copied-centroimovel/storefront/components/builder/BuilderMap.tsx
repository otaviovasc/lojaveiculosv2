"use client";

import type { ComponentStyleProps } from "@centroimovel/types";
import { motion } from "framer-motion";
import { useContext } from "react";
import { PreviewDocumentContext } from "./preview-document-context";
import { withPreviewMotionViewport } from "./preview-motion-viewport";
import { SectionSurface } from "./SectionSurface";
import { getBorderRadiusValue } from "./style-utils";
import { defaultTextColorForTextBlock } from "./text-block-colors";

interface BuilderMapProps {
  address?: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
  style?: ComponentStyleProps;
}

export function BuilderMap({
  address,
  latitude,
  longitude,
  zoom = 15,
  style,
}: BuilderMapProps) {
  const previewDocument = useContext(PreviewDocumentContext);
  const mapViewport = withPreviewMotionViewport(previewDocument, {
    once: true,
  });
  const resolvedTextColor =
    style?.textColor ?? defaultTextColorForTextBlock(style);
  const borderRadius =
    getBorderRadiusValue(style?.borderRadius as string | undefined) ?? "2rem";

  const clampedZoom = Math.min(20, Math.max(1, zoom));
  const delta = 360 / 2 ** (clampedZoom + 8);
  const encodedAddress = address ? encodeURIComponent(address) : "";

  if (!address && !latitude && !longitude) {
    return (
      <SectionSurface style={style} className="px-6 py-16 md:px-12">
        <div className="mx-auto text-center opacity-30 py-24 border-2 border-dashed border-white/10 rounded-[2rem]">
          <p
            className="text-xs font-bold uppercase tracking-[0.2em]"
            style={{ color: resolvedTextColor }}
          >
            Mapa não configurado — clique para adicionar localização
          </p>
        </div>
      </SectionSurface>
    );
  }

  return (
    <SectionSurface style={style} className="px-6 py-16 md:px-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={mapViewport}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-5xl"
      >
        <div
          className="relative aspect-video overflow-hidden shadow-2xl bg-stone-100 border border-white/10 transition-all duration-700 hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)]"
          style={{ borderRadius }}
        >
          {latitude && longitude ? (
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - delta}%2C${latitude - delta}%2C${longitude + delta}%2C${latitude + delta}&layer=mapnik&marker=${latitude}%2C${longitude}`}
              style={{
                border: 0,
                filter: "grayscale(1) contrast(1.2) opacity(0.8)",
              }}
              allowFullScreen
            />
          ) : address ? (
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              src={`https://www.google.com/maps?q=${encodedAddress}&z=${clampedZoom}&output=embed`}
              style={{ border: 0, filter: "grayscale(0.5) contrast(1.1)" }}
              allowFullScreen
            />
          ) : null}
        </div>
        {address && (
          <p
            className="mt-6 text-sm text-center font-medium opacity-60 tracking-wide"
            style={{ color: resolvedTextColor }}
          >
            {address}
          </p>
        )}
      </motion.div>
    </SectionSurface>
  );
}
