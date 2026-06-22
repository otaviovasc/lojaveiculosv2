import type { InventoryApi } from "../api/apiClient";
import { createInventoryFlowInput, validateInventoryForm } from "./formModel";
import { uploadInventoryFile } from "./mediaWorkspaceTypes";
import type { CreateMediaDraft } from "./createMediaDrafts";
import type { InventoryFormState } from "./formModel";
import type { InventoryListingDetail } from "./types";

export type InventoryCreateSubmitProgress = {
  label: string;
};

export type InventoryCreateSubmitResult =
  | {
      detail: InventoryListingDetail;
      kind: "complete";
      listingId: string;
      mediaCount: number;
    }
  | {
      attachedMediaCount: number;
      detail: InventoryListingDetail;
      failedMediaIds: readonly string[];
      kind: "saved_with_media_failure";
      listingId: string;
      mediaCount: number;
      message: string;
    };

export async function submitInventoryCreateFlow({
  api,
  form,
  media,
  onProgress,
}: {
  api: InventoryApi;
  form: InventoryFormState;
  media: readonly CreateMediaDraft[];
  onProgress: (progress: InventoryCreateSubmitProgress) => void;
}) {
  const validationMessage = validateInventoryForm(form);
  if (validationMessage) throw new Error(validationMessage);

  onProgress({ label: "Criando estoque" });
  const result = await api.createFlow(createInventoryFlowInput(form, null));
  const listingId = result.unit.listing.id;
  let detail = result.unit;
  const attachedMediaIds: string[] = [];

  for (const item of media) {
    onProgress({
      label: `Enviando midia ${item.displayOrder + 1}/${media.length}`,
    });
    try {
      await attachInventoryCreateMediaItem(api, listingId, item);
      attachedMediaIds.push(item.id);
    } catch (error) {
      return {
        attachedMediaCount: attachedMediaIds.length,
        detail,
        failedMediaIds: media
          .filter((draft) => !attachedMediaIds.includes(draft.id))
          .map((draft) => draft.id),
        kind: "saved_with_media_failure" as const,
        listingId,
        mediaCount: media.length,
        message: createMediaFailureMessage(error),
      };
    }
  }

  if (media.length > 0) {
    detail = await refreshListingDetail(api, listingId, detail);
  }

  return {
    detail,
    kind: "complete" as const,
    listingId,
    mediaCount: media.length,
  };
}

export async function retryInventoryCreateMedia({
  api,
  listingId,
  media,
  onProgress,
}: {
  api: InventoryApi;
  listingId: string;
  media: readonly CreateMediaDraft[];
  onProgress: (progress: InventoryCreateSubmitProgress) => void;
}): Promise<Extract<InventoryCreateSubmitResult, { kind: "complete" }>> {
  let detail = await api.getListing(listingId);
  const pending = media.filter((item) => !isMediaAlreadyAttached(detail, item));

  for (const item of pending) {
    onProgress({
      label: `Reenviando midia ${item.displayOrder + 1}/${media.length}`,
    });
    await attachInventoryCreateMediaItem(api, listingId, item);
  }

  detail = await refreshListingDetail(api, listingId, detail);

  return {
    detail,
    kind: "complete",
    listingId,
    mediaCount: media.length,
  };
}

async function attachInventoryCreateMediaItem(
  api: InventoryApi,
  listingId: string,
  item: CreateMediaDraft,
) {
  const upload = await api.requestMediaUpload(listingId, {
    file: item.file,
    kind: item.kind,
  });
  await uploadInventoryFile(item.file, upload);
  await api.createMedia(listingId, {
    altText: mediaAltText(item),
    displayOrder: item.displayOrder,
    kind: item.kind,
    storageKey: upload.storageKey,
  });
}

function isMediaAlreadyAttached(
  detail: InventoryListingDetail,
  item: CreateMediaDraft,
) {
  const altText = mediaAltText(item);

  return detail.media.some(
    (media) =>
      media.kind === item.kind &&
      media.displayOrder === item.displayOrder &&
      (media.altText === altText || media.storageKey.endsWith(item.file.name)),
  );
}

function createMediaFailureMessage(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);

  return `Estoque salvo, mas uma ou mais midias nao foram anexadas. ${detail}`;
}

function mediaAltText(item: CreateMediaDraft) {
  return item.altText.trim() || item.file.name;
}

async function refreshListingDetail(
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
