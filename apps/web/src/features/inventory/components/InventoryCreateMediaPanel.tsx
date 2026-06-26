import { ImageUp, Upload } from "lucide-react";
import { useState, type ChangeEvent, type DragEvent } from "react";
import { getVehicleColorLabel } from "@lojaveiculosv2/shared";
import {
  buildCreateMediaDrafts,
  createMediaLimits,
  moveCreateMediaDraft,
  removeCreateMediaDraft,
  type CreateMediaDraft,
  type CreateMediaReject,
} from "../model/createMediaDrafts";
import { createInventoryUnitsInput } from "../model/formModel";
import type { InventoryFormState } from "../model/formModel";
import { InventoryPanel } from "./InventoryFormParts";
import { InventoryCreateMediaCard } from "./InventoryCreateMediaCard";

export function InventoryCreateMediaPanel({
  form,
  items,
  onChange,
}: {
  form: InventoryFormState;
  items: readonly CreateMediaDraft[];
  onChange: (items: CreateMediaDraft[]) => void;
}) {
  const [rejected, setRejected] = useState<CreateMediaReject[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const addFiles = (files: File[]) => {
    if (files.length === 0) return;

    const defaultUnitDraftId = createUnitOptions(form)[0]?.value;
    const next = buildCreateMediaDrafts({
      current: items,
      files,
      previewUrl: (file) =>
        file.type.startsWith("image/") || file.type.startsWith("video/")
          ? URL.createObjectURL(file)
          : null,
      unitDraftId: defaultUnitDraftId,
    });

    onChange(next.accepted);
    setRejected(next.rejected);
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    addFiles(files);
  };

  const handleDragEnter = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.types.includes("Files")) {
      setIsDragActive(true);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.types.includes("Files")) {
      setIsDragActive(true);
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const files = Array.from(event.dataTransfer.files);
      addFiles(files);
    }
  };

  const photoCount = items.filter((item) => item.kind === "photo").length;
  const videoCount = items.filter((item) => item.kind === "video").length;
  const unitOptions = createUnitOptions(form);
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
                onUnitChange={(unitDraftId) =>
                  onChange(
                    items.map((candidate) =>
                      candidate.id === item.id
                        ? { ...candidate, unitDraftId }
                        : candidate,
                    ),
                  )
                }
                unitOptions={unitOptions}
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

        <label
          className={
            "grid min-h-28 cursor-pointer place-items-center rounded-xl border-2 border-dashed p-4 text-center transition-all duration-200 select-none " +
            (isDragActive
              ? "border-accent-strong bg-accent-soft/30 text-accent-strong scale-[1.01] shadow-md"
              : "border-line bg-app hover:bg-app-elevated text-app-text")
          }
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="pointer-events-none flex flex-col items-center justify-center">
            <Upload
              aria-hidden="true"
              className={
                "mb-1.5 size-5 transition-all duration-200 text-accent-strong" +
                (isDragActive ? " scale-125 animate-bounce" : "")
              }
            />
            <span className="text-sm font-black">
              {isDragActive
                ? "Solte os arquivos para enviar"
                : "Enviar fotos, video ou preview"}
            </span>
            <span className="text-xs font-bold text-muted">
              {photoCount}/{createMediaLimits.maxPhotos} fotos · {videoCount}/
              {createMediaLimits.maxVideos} video · ate 25 MB
            </span>
          </div>
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

function createUnitOptions(form: InventoryFormState) {
  return createInventoryUnitsInput(form).map((unit, index) => ({
    label:
      [getVehicleColorLabel(unit.colorName), unit.stockNumber]
        .filter(Boolean)
        .join(" · ") || `Unidade ${index + 1}`,
    value: String(index),
  }));
}
