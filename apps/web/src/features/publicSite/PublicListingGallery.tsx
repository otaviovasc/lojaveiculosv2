import { FileText, ImageIcon, Maximize2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicVehicleMedia } from "./types";

export function VehicleMediaShowcase({
  altText,
  media,
  onSelect,
  selectedMedia,
}: {
  altText: string;
  media: readonly PublicVehicleMedia[];
  onSelect: (url: string) => void;
  selectedMedia: PublicVehicleMedia | null;
}) {
  const heroMedia = selectedMedia ?? media[0] ?? null;
  const supportMedia = media
    .filter((item) => item.url !== heroMedia?.url)
    .slice(0, 4);
  const hiddenCount = Math.max(media.length - supportMedia.length - 1, 0);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-xl">
      <div className="grid gap-1.5 bg-line/70 p-1.5 lg:min-h-[460px] lg:grid-cols-12">
        <button
          className="group relative min-h-[280px] overflow-hidden rounded-lg bg-app text-left lg:col-span-8 lg:min-h-[448px]"
          onClick={() => heroMedia && onSelect(heroMedia.url)}
          type="button"
        >
          <MediaFrame
            altText={heroMedia?.altText ?? altText}
            className="size-full"
            media={heroMedia}
          />
          <GalleryActionLabel count={media.length} />
        </button>

        <div
          className={
            supportMedia.length >= 4
              ? "hidden grid-cols-2 grid-rows-2 gap-1.5 lg:col-span-4 lg:grid"
              : supportMedia.length === 1
                ? "hidden grid-rows-1 gap-1.5 lg:col-span-4 lg:grid"
                : "hidden grid-rows-2 gap-1.5 lg:col-span-4 lg:grid"
          }
        >
          {supportMedia.length ? (
            supportMedia.map((item, index) => (
              <button
                aria-label={item.altText ?? item.kind}
                className="group relative overflow-hidden rounded-lg bg-app text-left"
                key={`${item.displayOrder}-${item.url}`}
                onClick={() => onSelect(item.url)}
                type="button"
              >
                <MediaFrame
                  altText={item.altText ?? altText}
                  className="size-full"
                  media={item}
                />
                {index === supportMedia.length - 1 && hiddenCount > 0 ? (
                  <span className="absolute inset-0 grid place-items-center bg-black/55 text-lg font-black text-white">
                    +{hiddenCount}
                  </span>
                ) : null}
              </button>
            ))
          ) : (
            <div className="col-span-2 grid place-items-center rounded-lg bg-app text-muted">
              <ImageIcon aria-hidden="true" className="size-8" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function HeroMedia({
  altText,
  heroUrl,
  kind,
}: {
  altText: string;
  heroUrl: string | null;
  kind: PublicVehicleMedia["kind"];
}) {
  if (heroUrl && kind === "photo") {
    return (
      <div className="relative overflow-hidden rounded-xl border border-line bg-panel shadow-sm">
        <img
          alt={altText}
          className="aspect-[16/10] w-full object-cover"
          src={heroUrl}
        />
      </div>
    );
  }
  const Icon =
    kind === "video"
      ? Play
      : kind === "document_preview"
        ? FileText
        : ImageIcon;
  const label =
    kind === "video"
      ? "Vídeo do veículo"
      : kind === "document_preview"
        ? "Documento"
        : "Mídia";
  return (
    <div className="flex aspect-[16/10] flex-col items-center justify-center gap-3 rounded-xl border border-line bg-accent-soft text-accent">
      <Icon aria-hidden="true" className="size-12" />
      <span className="text-xs font-black uppercase tracking-[0.16em]">
        {label}
      </span>
    </div>
  );
}

function MediaFrame({
  altText,
  className,
  media,
}: {
  altText: string;
  className?: string;
  media: PublicVehicleMedia | null;
}) {
  if (media?.url && media.kind === "photo") {
    return (
      <img
        alt={altText}
        className={cn(
          className,
          "object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]",
        )}
        src={media.url}
      />
    );
  }

  const Icon =
    media?.kind === "video"
      ? Play
      : media?.kind === "document_preview"
        ? FileText
        : ImageIcon;
  const label =
    media?.kind === "video"
      ? "Vídeo do veículo"
      : media?.kind === "document_preview"
        ? "Documento"
        : "Mídia em breve";

  return (
    <span
      className={cn(
        className,
        "flex flex-col items-center justify-center gap-3 bg-accent-soft text-accent",
      )}
    >
      <Icon aria-hidden="true" className="size-12" />
      <span className="text-xs font-black uppercase tracking-[0.18em]">
        {label}
      </span>
    </span>
  );
}

function GalleryActionLabel({ count }: { count: number }) {
  if (count <= 1) return null;

  return (
    <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded bg-black/70 px-3 py-2 text-xs font-black text-white shadow-lg backdrop-blur">
      <Maximize2 aria-hidden="true" className="size-3.5" />
      {count} mídias
    </span>
  );
}

export function MediaStrip({
  media,
  onSelect,
  selectedUrl,
}: {
  media: readonly PublicVehicleMedia[];
  onSelect: (url: string) => void;
  selectedUrl: string | null;
}) {
  if (media.length <= 1) return null;
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" aria-label="Galeria">
      {media.map((item) => (
        <button
          aria-label={item.altText ?? item.kind}
          aria-pressed={item.url === selectedUrl}
          className="public-media-thumb group aspect-square overflow-hidden rounded-lg border border-line bg-panel shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 data-[selected=true]:border-accent data-[selected=true]:ring-2 data-[selected=true]:ring-accent/20"
          data-selected={item.url === selectedUrl ? "true" : undefined}
          key={`${item.displayOrder}-${item.url}`}
          onClick={() => onSelect(item.url)}
          type="button"
        >
          {item.kind === "photo" ? (
            <img
              alt=""
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              src={item.url}
            />
          ) : (
            <span className="grid size-full place-items-center bg-app text-muted">
              {item.kind === "video" ? (
                <Play aria-hidden="true" className="size-5" />
              ) : (
                <FileText aria-hidden="true" className="size-5" />
              )}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
