import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  FileText,
  Move,
  Save,
  Star,
  Trash2,
} from "lucide-react";
import { useState, type DragEvent, type ReactNode } from "react";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryMedia } from "../model/types";
import type { InventoryMediaRun } from "../model/mediaWorkspaceTypes";
import { InventoryBadge, InventoryInput } from "./InventoryFormParts";

export function MediaCard({
  api,
  index,
  isDragging,
  media,
  mediaItems,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  run,
  unitId,
}: {
  api: InventoryApi;
  index: number;
  isDragging: boolean;
  media: InventoryMedia;
  mediaItems: readonly InventoryMedia[];
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  run: InventoryMediaRun;
  unitId: string;
}) {
  const [altText, setAltText] = useState(media.altText ?? "");
  const saveAlt = () =>
    run("Salvando mídia", () =>
      api.updateMedia(unitId, media.id, { altText: altText.trim() || null }),
    );
  const togglePublic = () =>
    run("Atualizando mídia", () =>
      api.updateMedia(unitId, media.id, { isPublic: !media.isPublic }),
    );
  const coverId = firstPublicPhoto(mediaItems)?.id;
  const isCover = media.id === coverId;

  return (
    <article
      className={
        "group/card grid min-w-0 cursor-grab gap-3 rounded-xl border border-line bg-panel p-3 transition-all duration-200 active:cursor-grabbing " +
        (isDragging
          ? "border-accent scale-[0.98] shadow-md opacity-60"
          : "hover:border-line-strong hover:shadow-sm")
      }
      draggable
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={onDrop}
    >
      <div className="group relative aspect-video w-full overflow-hidden rounded-lg border border-line bg-app">
        <MediaPreview media={media} isPublic={media.isPublic} />

        <div className="pointer-events-none absolute left-2.5 top-2.5 flex select-none items-center gap-1.5">
          <InventoryBadge tone={media.isPublic ? "accent" : "warning"}>
            {media.id === coverId ? "capa" : mediaKindLabel(media.kind)}
          </InventoryBadge>
          <span className="inline-flex h-[22px] items-center justify-center rounded-full border border-white/10 bg-black/60 px-2 text-xs font-black text-white backdrop-blur-md">
            #{index + 1}
          </span>
        </div>

        <div className="absolute right-2.5 top-2.5 flex size-[26px] items-center justify-center rounded-full border border-white/10 bg-black/60 text-white/80 backdrop-blur-md transition-colors hover:text-white">
          <Move className="size-3" />
        </div>

        <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2.5 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover/card:opacity-100">
          <div className="flex gap-1 rounded-lg border border-white/10 bg-black/40 p-1 shadow-lg backdrop-blur-md">
            {media.kind === "photo" ? (
              <OverlayButton
                active={isCover}
                label={isCover ? "Capa atual" : "Definir como capa"}
                onClick={() => setCover(api, mediaItems, media, run, unitId)}
              >
                <Star
                  className={isCover ? "size-3.5 fill-white" : "size-3.5"}
                />
              </OverlayButton>
            ) : null}
            <OverlayButton
              label="Mover para trás"
              onClick={() => reorder(api, mediaItems, index, -1, run, unitId)}
            >
              <ArrowUp className="size-3.5" />
            </OverlayButton>
            <OverlayButton
              label="Mover para frente"
              onClick={() => reorder(api, mediaItems, index, 1, run, unitId)}
            >
              <ArrowDown className="size-3.5" />
            </OverlayButton>
            <OverlayButton
              label={media.isPublic ? "Ocultar" : "Publicar"}
              onClick={() => void togglePublic()}
            >
              {media.isPublic ? (
                <Eye className="size-3.5" />
              ) : (
                <EyeOff className="size-3.5" />
              )}
            </OverlayButton>
            <OverlayButton
              danger
              label="Remover"
              onClick={() =>
                void run("Removendo mídia", () =>
                  api.deleteMedia(unitId, media.id),
                )
              }
            >
              <Trash2 className="size-3.5" />
            </OverlayButton>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <InventoryInput
          aria-label="Texto alternativo"
          onChange={(event) => setAltText(event.target.value)}
          placeholder="Legenda da foto..."
          value={altText}
        />
        <button
          aria-label="Salvar texto"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-panel transition-colors hover:bg-line-strong hover:text-app-text"
          onClick={() => void saveAlt()}
          title="Salvar legenda"
          type="button"
        >
          <Save className="size-4" />
        </button>
      </div>
    </article>
  );
}

function OverlayButton({
  active,
  children,
  danger,
  label,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  danger?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={
        "flex size-8 items-center justify-center rounded-md border border-white/10 text-white transition-all " +
        (danger
          ? "bg-white/10 hover:border-red-500 hover:bg-red-500/80"
          : active
            ? "border-accent bg-accent hover:bg-accent/80"
            : "bg-white/10 hover:bg-white/20")
      }
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function firstPublicPhoto(media: readonly InventoryMedia[]) {
  return media.find((item) => item.kind === "photo" && item.isPublic);
}

function mediaKindLabel(kind: InventoryMedia["kind"]) {
  if (kind === "photo") return "foto";
  if (kind === "video") return "vídeo";
  return "documento";
}

function MediaPreview({
  isPublic,
  media,
}: {
  isPublic: boolean;
  media: InventoryMedia;
}) {
  const opacityClass = isPublic ? "" : "opacity-55";

  if (media.kind === "photo") {
    return (
      <img
        alt={media.altText ?? "Mídia do veículo"}
        className={`size-full object-cover transition-transform duration-500 group-hover/card:scale-105 ${opacityClass}`}
        src={media.url}
      />
    );
  }
  if (media.kind === "video") {
    return (
      <video
        className={`size-full object-cover ${opacityClass}`}
        controls
        preload="metadata"
        src={media.url}
      />
    );
  }
  return (
    <div className="grid size-full place-items-center bg-accent-soft text-sm font-black text-accent-strong">
      <FileText aria-hidden="true" className="size-5" />
    </div>
  );
}

function reorder(
  api: InventoryApi,
  mediaItems: readonly InventoryMedia[],
  index: number,
  direction: -1 | 1,
  run: InventoryMediaRun,
  unitId: string,
) {
  const next = [...mediaItems];
  const target = index + direction;
  const currentItem = next[index];
  const targetItem = next[target];
  if (!currentItem || !targetItem) return;
  next[index] = targetItem;
  next[target] = currentItem;
  void run("Reordenando mídia", () =>
    api.reorderMedia(
      unitId,
      next.map((item, displayOrder) => ({ displayOrder, mediaId: item.id })),
    ),
  );
}

export function reorderTo(
  api: InventoryApi,
  mediaItems: readonly InventoryMedia[],
  from: number,
  to: number,
  run: InventoryMediaRun,
  unitId: string,
) {
  if (from === to || from < 0 || to < 0 || from >= mediaItems.length) return;
  const next = [...mediaItems];
  const [moved] = next.splice(from, 1);
  if (!moved) return;
  next.splice(Math.min(to, next.length), 0, moved);
  void run("Reordenando mídia", () =>
    api.reorderMedia(
      unitId,
      next.map((item, displayOrder) => ({ displayOrder, mediaId: item.id })),
    ),
  );
}

function setCover(
  api: InventoryApi,
  mediaItems: readonly InventoryMedia[],
  media: InventoryMedia,
  run: InventoryMediaRun,
  unitId: string,
) {
  const ordered = [
    media,
    ...mediaItems.filter((item) => item.id !== media.id),
  ].map((item, displayOrder) => ({ displayOrder, mediaId: item.id }));
  void run("Definindo capa pública", async () => {
    if (!media.isPublic) {
      await api.updateMedia(unitId, media.id, { isPublic: true });
    }
    return api.reorderMedia(unitId, ordered);
  });
}
