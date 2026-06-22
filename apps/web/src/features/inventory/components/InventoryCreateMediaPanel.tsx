import {
  ArrowDown,
  ArrowUp,
  ImageUp,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { useState, type ChangeEvent, type ReactNode } from "react";
import {
  buildCreateMediaDrafts,
  createMediaLimits,
  moveCreateMediaDraft,
  removeCreateMediaDraft,
  type CreateMediaDraft,
  type CreateMediaReject,
} from "../model/createMediaDrafts";
import {
  InventoryBadge,
  InventoryInput,
  InventoryPanel,
} from "./InventoryFormParts";

export function InventoryCreateMediaPanel({
  items,
  onChange,
}: {
  items: readonly CreateMediaDraft[];
  onChange: (items: CreateMediaDraft[]) => void;
}) {
  const [rejected, setRejected] = useState<CreateMediaReject[]>([]);

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

  return (
    <InventoryPanel icon={<ImageUp className="size-5" />} title="Fotos e video">
      <div className="grid gap-4">
        <label className="grid min-h-36 cursor-pointer place-items-center rounded-lg border border-dashed border-line bg-app p-4 text-center">
          <Upload aria-hidden="true" className="mb-2 size-6 text-accent-strong" />
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

        {items.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item, index) => (
              <CreateMediaCard
                item={item}
                index={index}
                key={item.id}
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
          <p className="text-sm font-bold text-muted">
            A primeira foto publica sera usada como capa do anuncio.
          </p>
        )}

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

function CreateMediaCard({
  item,
  index,
  onAltText,
  onMove,
  onRemove,
}: {
  item: CreateMediaDraft;
  index: number;
  onAltText: (value: string) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <article className="grid gap-3 rounded-lg border border-line bg-panel p-3">
      <CreateMediaPreview item={item} />
      <div className="flex items-center justify-between gap-2">
        <InventoryBadge tone={index === 0 && item.kind === "photo" ? "accent" : "blue"}>
          {index === 0 && item.kind === "photo" ? "capa" : item.kind}
        </InventoryBadge>
        <div className="flex gap-1">
          <IconButton label="Subir" onClick={() => onMove(-1)}>
            <ArrowUp className="size-4" />
          </IconButton>
          <IconButton label="Descer" onClick={() => onMove(1)}>
            <ArrowDown className="size-4" />
          </IconButton>
          <IconButton label="Remover" onClick={onRemove}>
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>
      <InventoryInput
        aria-label="Texto alternativo"
        onChange={(event) => onAltText(event.target.value)}
        value={item.altText}
      />
    </article>
  );
}

function CreateMediaPreview({ item }: { item: CreateMediaDraft }) {
  if (item.kind === "photo" && item.previewUrl) {
    return (
      <img
        alt={item.altText || "Preview da foto"}
        className="aspect-video w-full rounded-lg bg-app object-cover"
        src={item.previewUrl}
      />
    );
  }

  if (item.kind === "video" && item.previewUrl) {
    return (
      <video
        className="aspect-video w-full rounded-lg bg-app object-cover"
        muted
        src={item.previewUrl}
      />
    );
  }

  return (
    <div className="grid aspect-video place-items-center rounded-lg bg-accent-soft text-sm font-black text-accent-strong">
      <Video aria-hidden="true" className="mb-2 size-5" />
      {item.file.name}
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="icon-button"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function formatRejects(rejected: readonly CreateMediaReject[]) {
  return rejected
    .map((item) => `${item.fileName}: ${item.reason}`)
    .join(" ");
}
