import { ArrowLeft, ArrowRight, Move, Trash2, Video } from "lucide-react";
import type { DragEvent, ReactNode } from "react";
import type { CreateMediaDraft } from "../model/createMediaDrafts";
import {
  InventoryBadge,
  InventoryInput,
  InventorySelect,
} from "./InventoryFormParts";

export type CreateMediaUnitOption = {
  label: string;
  value: string;
};

export function InventoryCreateMediaCard({
  index,
  item,
  onAltText,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onMove,
  onRemove,
  onUnitChange,
  unitOptions = [],
}: {
  index: number;
  item: CreateMediaDraft;
  onAltText: (value: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onUnitChange?: (value: string) => void;
  unitOptions?: readonly CreateMediaUnitOption[];
}) {
  const isCover = index === 0 && item.kind === "photo";
  const unitValue = item.unitDraftId ?? unitOptions[0]?.value ?? "";

  return (
    <article
      className="grid gap-3 rounded-xl border border-line bg-panel p-3"
      draggable
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={onDrop}
    >
      <div className="group relative overflow-hidden rounded-lg border border-line bg-app">
        <CreateMediaPreview item={item} />
        <div className="absolute left-2 top-2 flex flex-wrap items-center gap-1.5">
          <InventoryBadge tone={isCover ? "accent" : "blue"}>
            {isCover ? "capa" : item.kind}
          </InventoryBadge>
          {index > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-line bg-panel/90 px-2 py-1 text-xs font-black text-muted shadow-sm">
              <Move className="size-3" />#{index + 1}
            </span>
          ) : null}
        </div>
        <div className="absolute inset-0 flex items-end justify-center gap-2 bg-overlay p-3 opacity-0 transition-opacity group-hover:opacity-100">
          <IconButton label="Mover para tras" onClick={() => onMove(-1)}>
            <ArrowLeft className="size-4" />
          </IconButton>
          <IconButton label="Mover para frente" onClick={() => onMove(1)}>
            <ArrowRight className="size-4" />
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
      {unitOptions.length > 1 && onUnitChange ? (
        <InventorySelect
          ariaLabel="Unidade da midia"
          className="min-h-10"
          onChange={onUnitChange}
          options={unitOptions}
          value={unitValue}
        />
      ) : null}
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
