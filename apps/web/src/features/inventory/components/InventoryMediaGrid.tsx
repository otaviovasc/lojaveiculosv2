import { useState } from "react";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryMedia } from "../model/types";
import type { InventoryMediaRun } from "../model/mediaWorkspaceTypes";
import { MediaCard, reorderTo } from "./InventoryMediaCard";

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
