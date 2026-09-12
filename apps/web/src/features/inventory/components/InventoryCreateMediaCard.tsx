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
  isDragging = false,
  isDragOver = false,
  item,
  onAltText,
  onDragEnd,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDragStart,
  onDrop,
  onMove,
  onRemove,
  onUnitChange,
  unitOptions = [],
}: {
  index: number;
  isDragging?: boolean;
  isDragOver?: boolean;
  item: CreateMediaDraft;
  onAltText: (value: string) => void;
  onDragEnd: () => void;
  onDragEnter?: () => void;
  onDragLeave?: () => void;
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
      className={
        "group/card relative grid min-w-0 cursor-grab gap-2 rounded-xl border bg-panel p-2 transition-all duration-200 active:cursor-grabbing select-none " +
        (isDragging
          ? "opacity-40 scale-[0.96] rotate-[1deg] border-accent ring-2 ring-accent ring-offset-1 shadow-xl z-10"
          : isDragOver
            ? "border-accent-strong bg-accent-soft/20 scale-[1.02] shadow-lg ring-2 ring-accent-strong/30 ring-offset-1 z-10"
            : index === 0 && item.kind === "photo"
              ? "border-accent scale-[0.99] shadow-sm hover:shadow-md"
              : "border-line hover:border-line-strong hover:shadow-sm")
      }
      draggable
      onDragEnd={onDragEnd}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={onDrop}
    >
      <div className="group relative aspect-video w-full overflow-hidden rounded-lg border border-line bg-app">
        <CreateMediaPreview item={item} />

        {/* Top left overlay badge & display order */}
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 pointer-events-none select-none">
          <InventoryBadge tone={isCover ? "accent" : "blue"}>
            {isCover
              ? "capa"
              : item.kind === "photo"
                ? "Foto"
                : item.kind === "video"
                  ? "Vídeo"
                  : item.kind}
          </InventoryBadge>
          <span className="inline-flex h-[22px] items-center justify-center rounded-full bg-black/60 px-2 text-xs font-black text-white backdrop-blur-md border border-white/10">
            #{index + 1}
          </span>
        </div>

        {/* Drag handle */}
        <div
          className={
            "absolute right-2.5 top-2.5 flex size-[26px] items-center justify-center rounded-full backdrop-blur-md border transition-all " +
            (isDragging
              ? "bg-accent text-accent-foreground border-accent-strong scale-110"
              : isDragOver
                ? "bg-accent-soft text-accent-strong border-accent-strong/40 scale-105"
                : "bg-black/60 text-white/80 border-white/10 hover:text-white")
          }
        >
          <Move className={"size-3 " + (isDragging ? "animate-pulse" : "")} />
        </div>

        {/* Drag-over overlay hint */}
        {isDragOver ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-lg bg-accent-soft/40 backdrop-blur-[1px] border-2 border-dashed border-accent-strong/60">
            <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-black text-accent-foreground shadow-md">
              Solte aqui
            </span>
          </div>
        ) : null}

        {/* Bottom actions bar overlay */}
        <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2.5 opacity-100 sm:opacity-0 sm:group-hover/card:opacity-100 transition-opacity duration-200">
          <div className="flex gap-1 rounded-lg bg-black/40 p-1 backdrop-blur-md border border-white/10 shadow-lg">
            <OverlayButton label="Mover para trás" onClick={() => onMove(-1)}>
              <ArrowLeft className="size-3.5" />
            </OverlayButton>
            <OverlayButton label="Mover para frente" onClick={() => onMove(1)}>
              <ArrowRight className="size-3.5" />
            </OverlayButton>
            <OverlayButton label="Remover" onClick={onRemove} danger>
              <Trash2 className="size-3.5" />
            </OverlayButton>
          </div>
        </div>
      </div>

      {/* Alt text field (matches style) */}
      <InventoryInput
        aria-label="Texto alternativo"
        className="h-8 !min-h-8 px-2.5 py-1.5 text-xs"
        placeholder="Legenda da foto..."
        onChange={(event) => onAltText(event.target.value)}
        value={item.altText}
      />
      {unitOptions.length > 1 && onUnitChange ? (
        <InventorySelect
          ariaLabel="Unidade da midia"
          className="min-h-[2.75rem]"
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
        className="size-full object-cover transition-transform duration-500 group-hover/card:scale-105"
        src={item.previewUrl}
      />
    );
  }

  if (item.kind === "video" && item.previewUrl) {
    return (
      <video className="size-full object-cover" muted src={item.previewUrl} />
    );
  }

  return (
    <div className="grid size-full place-items-center bg-accent-soft text-sm font-black text-accent-strong">
      <div className="flex flex-col items-center">
        <Video aria-hidden="true" className="mb-2 size-5" />
        <span className="max-w-full truncate px-2 text-xs">
          {item.file.name}
        </span>
      </div>
    </div>
  );
}

function OverlayButton({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      aria-label={label}
      className={
        "flex size-8 items-center justify-center rounded-md border border-white/10 text-white transition-all " +
        (danger
          ? "bg-white/10 hover:bg-red-500/80 hover:border-red-500"
          : "bg-white/10 hover:bg-white/20")
      }
      title={label}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
