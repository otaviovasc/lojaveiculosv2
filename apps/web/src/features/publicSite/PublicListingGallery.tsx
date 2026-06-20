import { ImageIcon } from "lucide-react";
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
      <img
        alt={altText}
        className="aspect-[16/10] w-full rounded-lg object-cover"
        src={heroUrl}
      />
    );
  }
  return (
    <div className="flex aspect-[16/10] items-center justify-center rounded-lg bg-accent-soft text-accent">
      <ImageIcon aria-hidden="true" className="size-14" />
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
          className="public-media-thumb aspect-square overflow-hidden rounded-md border bg-panel"
          data-selected={item.url === selectedUrl ? "true" : undefined}
          key={`${item.displayOrder}-${item.url}`}
          onClick={() => onSelect(item.url)}
          type="button"
        >
          {item.kind === "photo" ? (
            <img alt="" className="size-full object-cover" src={item.url} />
          ) : (
            <span className="grid size-full place-items-center text-xs font-black text-muted">
              {item.kind === "video" ? "VIDEO" : "DOC"}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
