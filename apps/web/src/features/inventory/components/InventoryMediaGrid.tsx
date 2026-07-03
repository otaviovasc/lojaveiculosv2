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
import { useState, type DragEvent } from "react";
import type { InventoryApi } from "../api/apiClient";
import { InventoryBadge, InventoryInput } from "./InventoryFormParts";
import type { InventoryMedia } from "../model/types";
import type {
  IconActionProps,
  InventoryMediaRun,
} from "../model/mediaWorkspaceTypes";

export function InventoryMediaGrid({
  api,
  media,
  run,
  unitId,
}: {
  api: InventoryApi;
  media: readonly InventoryMedia[];
  run: InventoryMediaRun;
  unitId: string;
}) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  if (media.length === 0) {
    return (
      <p className="text-sm font-bold text-muted">Nenhuma mídia enviada.</p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {media.map((item, index) => (
        <MediaCard
          api={api}
          index={index}
          isDragging={draggedIndex === index}
          key={item.id}
          media={item}
          mediaItems={media}
          onDragEnd={() => setDraggedIndex(null)}
          onDragOver={(event) => event.preventDefault()}
          onDragStart={(event) => {
            setDraggedIndex(index);
            event.dataTransfer.effectAllowed = "move";
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (draggedIndex !== null) {
              reorderTo(api, media, draggedIndex, index, run, unitId);
            }
            setDraggedIndex(null);
          }}
          run={run}
          unitId={unitId}
        />
      ))}
    </div>
  );
}

function MediaCard({
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

  return (
    <article
      className={
        "grid min-w-0 cursor-grab gap-3 rounded-lg border border-line bg-panel p-3 transition-all active:cursor-grabbing " +
        (isDragging
          ? "border-accent opacity-70 shadow-lg"
          : "hover:border-line-strong")
      }
      draggable
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={onDrop}
    >
      <MediaPreview media={media} />
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <InventoryBadge tone={media.isPublic ? "accent" : "warning"}>
            {media.id === coverId ? "capa" : mediaKindLabel(media.kind)}
          </InventoryBadge>
          <span className="inline-flex items-center gap-1 rounded-md border border-line bg-app px-2 py-1 text-xs font-black text-muted">
            <Move className="size-3" />
            Arraste
          </span>
        </div>
        <div className="flex gap-1">
          {media.kind === "photo" ? (
            <IconAction
              label="Definir capa"
              onClick={() => setCover(api, mediaItems, media, run, unitId)}
            >
              <Star className="size-4" />
            </IconAction>
          ) : null}
          <IconAction
            label="Subir"
            onClick={() => reorder(api, mediaItems, index, -1, run, unitId)}
          >
            <ArrowUp className="size-4" />
          </IconAction>
          <IconAction
            label="Descer"
            onClick={() => reorder(api, mediaItems, index, 1, run, unitId)}
          >
            <ArrowDown className="size-4" />
          </IconAction>
          <IconAction
            label={media.isPublic ? "Ocultar" : "Publicar"}
            onClick={() => void togglePublic()}
          >
            {media.isPublic ? (
              <Eye className="size-4" />
            ) : (
              <EyeOff className="size-4" />
            )}
          </IconAction>
          <IconAction
            label="Remover"
            onClick={() =>
              void run("Removendo mídia", () =>
                api.deleteMedia(unitId, media.id),
              )
            }
          >
            <Trash2 className="size-4" />
          </IconAction>
        </div>
      </div>
      <div className="flex gap-2">
        <InventoryInput
          aria-label="Texto alternativo"
          value={altText}
          onChange={(event) => setAltText(event.target.value)}
        />
        <IconAction label="Salvar texto" onClick={() => void saveAlt()}>
          <Save className="size-4" />
        </IconAction>
      </div>
    </article>
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

function MediaPreview({ media }: { media: InventoryMedia }) {
  if (media.kind === "photo") {
    return (
      <img
        alt={media.altText ?? "Mídia do veículo"}
        className="aspect-video w-full rounded-lg border border-line bg-app object-contain"
        src={media.url}
      />
    );
  }
  if (media.kind === "video") {
    return (
      <video
        className="aspect-video w-full rounded-lg border border-line bg-app object-contain"
        controls
        preload="metadata"
        src={media.url}
      />
    );
  }
  return (
    <div className="grid aspect-video place-items-center rounded-lg border border-line bg-accent-soft text-sm font-black text-accent-strong">
      <FileText aria-hidden="true" className="size-5" />
    </div>
  );
}

function IconAction({ children, label, onClick }: IconActionProps) {
  return (
    <button
      aria-label={label}
      className="icon-button"
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
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

function reorderTo(
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
