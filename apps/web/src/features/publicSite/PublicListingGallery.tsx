import { FileText, ImageIcon, Play } from "lucide-react";
import type { PublicVehicleMedia } from "./types";

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
      ? "Video do veiculo"
      : kind === "document_preview"
        ? "Documento"
        : "Midia";
  return (
    <div className="flex aspect-[16/10] flex-col items-center justify-center gap-3 rounded-xl border border-line bg-accent-soft text-accent">
      <Icon aria-hidden="true" className="size-12" />
      <span className="text-xs font-black uppercase tracking-[0.16em]">
        {label}
      </span>
    </div>
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
