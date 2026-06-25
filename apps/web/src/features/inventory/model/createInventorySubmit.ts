import type { InventoryApi } from "../api/apiClient";
import {
  createInventoryFlowInput,
  validateInventoryForm,
  parsePriceCents,
} from "./formModel";
import { uploadInventoryFile } from "./mediaWorkspaceTypes";
import type { CreateMediaDraft } from "./createMediaDrafts";
import type { InventoryFormState } from "./formModel";
import type { CreateInventoryUnitInput, InventoryListingDetail } from "./types";

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
      failedStep: "media" | "unit";
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
  const input = createInventoryFlowInput(form, null);
  let detail = await api.createListing(input.listing);
  const listingId = detail.listing.id;

  try {
    detail = await attachInventoryUnits({
      api,
      detail,
      listingId,
      onProgress,
      units: input.units ?? [input.unit],
    });
  } catch (error) {
    return {
      attachedMediaCount: 0,
      detail,
      failedMediaIds: media.map((draft) => draft.id),
      failedStep: "unit" as const,
      kind: "saved_with_media_failure" as const,
      listingId,
      mediaCount: media.length,
      message: createUnitFailureMessage(error),
    };
  }

  if (form.acquisitionPrice) {
    const acquisitionPriceCents = parsePriceCents(form.acquisitionPrice);
    if (acquisitionPriceCents !== null && acquisitionPriceCents > 0) {
      onProgress({ label: "Registrando valor de entrada" });
      try {
        detail = await api.addCost(listingId, {
          amountCents: acquisitionPriceCents,
          kind: "acquisition",
          description: "Valor de Entrada",
        });
      } catch (error) {
        console.error("Failed to add acquisition cost:", error);
      }
    }
  }

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
        failedStep: "media" as const,
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
  form,
  listingId,
  media,
  onProgress,
}: {
  api: InventoryApi;
  form?: InventoryFormState;
  listingId: string;
  media: readonly CreateMediaDraft[];
  onProgress: (progress: InventoryCreateSubmitProgress) => void;
}): Promise<Extract<InventoryCreateSubmitResult, { kind: "complete" }>> {
  let detail = await api.getListing(listingId);
  if (form) {
    detail = await ensureInventoryUnitAttached({
      api,
      detail,
      form,
      listingId,
      onProgress,
    });
  }

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

async function attachInventoryUnits({
  api,
  detail,
  listingId,
  onProgress,
  units,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  listingId: string;
  onProgress: (progress: InventoryCreateSubmitProgress) => void;
  units: readonly CreateInventoryUnitInput[];
}) {
  let updated = detail;

  for (const [index, unit] of units.entries()) {
    onProgress({
      label:
        units.length > 1
          ? `Vinculando unidade ${index + 1}/${units.length}`
          : "Vinculando unidade",
    });
    updated = await api.attachUnit(listingId, unit);
  }

  return updated;
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

function createUnitFailureMessage(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);

  return `Estoque salvo, mas a unidade operacional nao foi vinculada. ${detail}`;
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

async function ensureInventoryUnitAttached({
  api,
  detail,
  form,
  listingId,
  onProgress,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  form: InventoryFormState;
  listingId: string;
  onProgress: (progress: InventoryCreateSubmitProgress) => void;
}) {
  const input = createInventoryFlowInput(form, null);
  const pendingUnits = listPendingUnits(detail, input.units ?? [input.unit]);

  if (pendingUnits.length === 0) return detail;

  return attachInventoryUnits({
    api,
    detail,
    listingId,
    onProgress,
    units: pendingUnits,
  });
}

function listPendingUnits(
  detail: InventoryListingDetail,
  expectedUnits: readonly CreateInventoryUnitInput[],
) {
  const existingCounts = new Map<string, number>();
  for (const unit of detail.units) {
    const key = unitColorKey(unit);
    existingCounts.set(key, (existingCounts.get(key) ?? 0) + 1);
  }

  return expectedUnits.filter((unit) => {
    const key = unitColorKey(unit);
    const count = existingCounts.get(key) ?? 0;
    if (count <= 0) return true;
    existingCounts.set(key, count - 1);
    return false;
  });
}

function unitColorKey(input: { colorName?: string | null }) {
  return input.colorName ?? "";
}
