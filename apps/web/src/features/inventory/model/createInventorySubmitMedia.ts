import type { InventoryApi } from "../api/apiClient";
import type { CreateMediaDraft } from "./createMediaDrafts";
import { uploadInventoryFile } from "./mediaWorkspaceTypes";
import type { InventoryListingDetail } from "./types";

export async function attachInventoryCreateMediaItem(
  api: InventoryApi,
  unitId: string,
  item: CreateMediaDraft,
) {
  const upload = await api.requestMediaUpload(unitId, {
    file: item.file,
    kind: item.kind,
  });
  await uploadInventoryFile(item.file, upload);
  await api.createMedia(unitId, {
    altText: mediaAltText(item),
    displayOrder: item.displayOrder,
    kind: item.kind,
    storageKey: upload.storageKey,
  });
}

export function isMediaAlreadyAttached(
  detail: InventoryListingDetail,
  item: CreateMediaDraft,
  unitId: string,
) {
  const altText = mediaAltText(item);

  return detail.media.some(
    (media) =>
      media.unitId === unitId &&
      media.kind === item.kind &&
      media.displayOrder === item.displayOrder &&
      (media.altText === altText || media.storageKey.endsWith(item.file.name)),
  );
}

export function createMediaFailureMessage(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);

  return `Estoque salvo, mas uma ou mais midias nao foram anexadas. ${detail}`;
}

export async function refreshListingDetail(
  api: InventoryApi,
  listingId: string,
  fallback: InventoryListingDetail,
) {
  try {
    return await api.getListing(listingId);
  } catch {
    return fallback;
  }
}

function mediaAltText(item: CreateMediaDraft) {
  return item.altText.trim() || item.file.name;
}
