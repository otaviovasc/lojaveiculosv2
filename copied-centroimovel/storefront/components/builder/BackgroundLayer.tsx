"use client";

import type { BackgroundConfig } from "@centroimovel/types";

function renderGradient(gradient?: {
  type: string;
  angle?: number;
  stops?: Array<{ color: string; position: number }>;
}): string {
  if (!gradient || !gradient.stops) {
    return "linear-gradient(180deg, #000 0%, #fff 100%)";
  }
  const stops = gradient.stops
    .map((s) => `${s.color} ${s.position}%`)
    .join(", ");
  if (gradient.type === "radial") {
    return `radial-gradient(${stops})`;
  }
  return `linear-gradient(${gradient.angle || 180}deg, ${stops})`;
}

interface BackgroundLayerProps {
  config?: BackgroundConfig;
}

export function BackgroundLayer({ config }: BackgroundLayerProps) {
  if (!config) return null;

  switch (config.type) {
    case "solid":
      return (
        <div
          className="absolute inset-0 z-0"
          style={{ backgroundColor: config.solidColor || "#FFFFFF" }}
        />
      );

    case "gradient":
      return (
        <>
          <div
            className="absolute inset-0 z-0"
            style={{ background: renderGradient(config.gradient) }}
          />
          {config.overlay?.enabled && (
            <div
              className="absolute inset-0 z-[1]"
              style={{
                backgroundColor: config.overlay.color,
                opacity: (config.overlay.opacity ?? 50) / 100,
              }}
            />
          )}
        </>
      );

    case "image":
      return (
        <>
          <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: config.imageUrl
                ? `url(${config.imageUrl})`
                : undefined,
            }}
          />
          {config.overlay?.enabled && (
            <div
              className="absolute inset-0 z-[1]"
              style={{
                backgroundColor: config.overlay.color,
                opacity: (config.overlay.opacity ?? 50) / 100,
              }}
            />
          )}
        </>
      );

    case "video":
      return (
        <>
          {config.videoUrl && (
            <video
              className="absolute inset-0 z-0 h-full w-full object-cover"
              src={config.videoUrl}
              autoPlay={config.videoAutoplay ?? true}
              loop={config.videoLoop ?? true}
              muted={config.videoMuted ?? true}
              playsInline
            />
          )}
          {config.overlay?.enabled && (
            <div
              className="absolute inset-0 z-[1]"
              style={{
                backgroundColor: config.overlay.color,
                opacity: (config.overlay.opacity ?? 50) / 100,
              }}
            />
          )}
        </>
      );

    default:
      return null;
  }
}
