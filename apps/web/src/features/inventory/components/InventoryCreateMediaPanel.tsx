import { ImageUp, Upload } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import {
  buildCreateMediaDrafts,
  createMediaLimits,
  moveCreateMediaDraft,
  removeCreateMediaDraft,
  type CreateMediaDraft,
  type CreateMediaReject,
} from "../model/createMediaDrafts";
import { InventoryPanel } from "./InventoryFormParts";
import { InventoryCreateMediaCard } from "./InventoryCreateMediaCard";

export function InventoryCreateMediaPanel({
  items,
  onChange,
}: {
  items: readonly CreateMediaDraft[];
  onChange: (items: CreateMediaDraft[]) => void;
}) {
  const [rejected, setRejected] = useState<CreateMediaReject[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const next = buildCreateMediaDrafts({
      current: items,
      files,
      previewUrl: (file) =>
        file.type.startsWith("image/") || file.type.startsWith("video/")
          ? URL.createObjectURL(file)
          : null,
    });

    onChange(next.accepted);
    setRejected(next.rejected);
  };

  const photoCount = items.filter((item) => item.kind === "photo").length;
  const videoCount = items.filter((item) => item.kind === "video").length;
  const reorderTo = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(Math.min(to, next.length), 0, moved);
    onChange(next.map((item, displayOrder) => ({ ...item, displayOrder })));
  };

  return (
    <InventoryPanel icon={<ImageUp className="size-5" />} title="Fotos e video">
      <div className="grid gap-4">
        {items.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item, index) => (
              <InventoryCreateMediaCard
                item={item}
                index={index}
                key={item.id}
                onDragEnd={() => setDraggedIndex(null)}
                onDragOver={(event) => event.preventDefault()}
                onDragStart={(event) => {
                  setDraggedIndex(index);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggedIndex !== null) reorderTo(draggedIndex, index);
                  setDraggedIndex(null);
                }}
                onAltText={(altText) =>
                  onChange(
                    items.map((candidate) =>
                      candidate.id === item.id
                        ? { ...candidate, altText }
                        : candidate,
                    ),
                  )
                }
                onMove={(direction) =>
                  onChange(moveCreateMediaDraft(items, index, direction))
                }
                onRemove={() => {
                  if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
                  onChange(removeCreateMediaDraft(items, item.id));
                }}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-line bg-app/40 px-4 py-3 text-center">
            <p className="text-xs font-bold text-muted">
              Nenhuma foto selecionada. A primeira foto publica sera usada como
              capa do anuncio.
            </p>
          </div>
        )}

        <label className="grid min-h-24 cursor-pointer place-items-center rounded-xl border border-dashed border-line bg-app p-3 text-center transition-colors hover:bg-app-elevated">
          <Upload
            aria-hidden="true"
            className="mb-1.5 size-5 text-accent-strong"
          />
          <span className="text-sm font-black text-app-text">
            Enviar fotos, video ou preview
          </span>
          <span className="text-xs font-bold text-muted">
            {photoCount}/{createMediaLimits.maxPhotos} fotos · {videoCount}/
            {createMediaLimits.maxVideos} video · ate 25 MB
          </span>
          <input
            accept="image/*,video/*,application/pdf"
            className="sr-only"
            multiple
            onChange={handleFiles}
            type="file"
          />
        </label>

        {rejected.length > 0 ? (
          <div className="rounded-lg border border-line bg-app p-3 text-sm font-bold text-danger">
            <strong className="block">Arquivos nao adicionados</strong>
            {formatRejects(rejected)}
          </div>
        ) : null}
      </div>
    </InventoryPanel>
  );
}

function formatRejects(rejected: readonly CreateMediaReject[]) {
  return rejected.map((item) => `${item.fileName}: ${item.reason}`).join(" ");
}
