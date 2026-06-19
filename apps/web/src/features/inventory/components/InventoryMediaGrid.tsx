import { ArrowDown, ArrowUp, Eye, EyeOff, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import type { InventoryApi } from "../api/apiClient";
import { InventoryBadge, InventoryInput } from "./InventoryFormParts";
import type { InventoryListingDetail, InventoryMedia } from "../model/types";
import type {
  IconActionProps,
  InventoryMediaRun,
} from "../model/mediaWorkspaceTypes";

export function InventoryMediaGrid({
  api,
  detail,
  run,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  run: InventoryMediaRun;
}) {
  if (detail.media.length === 0) {
    return (
      <p className="text-sm font-bold text-muted">Nenhuma midia enviada.</p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {detail.media.map((media, index) => (
        <MediaCard
          api={api}
          detail={detail}
          index={index}
          key={media.id}
          media={media}
          run={run}
        />
      ))}
    </div>
  );
}

function MediaCard({
  api,
  detail,
  index,
  media,
  run,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  index: number;
  media: InventoryMedia;
  run: InventoryMediaRun;
}) {
  const [altText, setAltText] = useState(media.altText ?? "");
  const listingId = detail.listing.id;
  const saveAlt = () =>
    run("Salvando midia", () =>
      api.updateMedia(listingId, media.id, { altText: altText.trim() || null }),
    );
  const togglePublic = () =>
    run("Atualizando midia", () =>
      api.updateMedia(listingId, media.id, { isPublic: !media.isPublic }),
    );

  return (
    <article className="grid min-w-0 gap-3 rounded-lg border border-line bg-panel p-3">
      <MediaPreview media={media} />
      <div className="flex items-center justify-between gap-2">
        <InventoryBadge tone={media.isPublic ? "accent" : "warning"}>
          {media.kind}
        </InventoryBadge>
        <div className="flex gap-1">
          <IconAction
            label="Subir"
            onClick={() => reorder(api, detail, index, -1, run)}
          >
            <ArrowUp className="size-4" />
          </IconAction>
          <IconAction
            label="Descer"
            onClick={() => reorder(api, detail, index, 1, run)}
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
              void run("Removendo midia", () =>
                api.deleteMedia(listingId, media.id),
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

function MediaPreview({ media }: { media: InventoryMedia }) {
  if (media.kind === "photo") {
    return (
      <img
        alt={media.altText ?? "Midia do veiculo"}
        className="aspect-video w-full rounded-lg bg-app object-cover"
        src={media.url}
      />
    );
  }
  return (
    <div className="grid aspect-video place-items-center rounded-lg bg-accent-soft text-sm font-black text-accent-strong">
      {media.kind === "video" ? "VIDEO" : "DOC"}
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
  detail: InventoryListingDetail,
  index: number,
  direction: -1 | 1,
  run: InventoryMediaRun,
) {
  const next = [...detail.media];
  const target = index + direction;
  const currentItem = next[index];
  const targetItem = next[target];
  if (!currentItem || !targetItem) return;
  next[index] = targetItem;
  next[target] = currentItem;
  void run("Reordenando midia", () =>
    api.reorderMedia(
      detail.listing.id,
      next.map((item, displayOrder) => ({ displayOrder, mediaId: item.id })),
    ),
  );
}
