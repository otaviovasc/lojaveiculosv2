import type { InventoryApi } from "../api/apiClient";
import {
  createInventoryFlowInput,
  validateInventoryForm,
  parsePriceCents,
} from "./formModel";
import type { CreateMediaDraft } from "./createMediaDrafts";
import type { InventoryFormState } from "./formModel";
import type { InventoryListingDetail } from "./types";
import type { InventoryCreateSubmitProgress } from "./createInventorySubmitTypes";
import {
  attachInventoryCreateMediaItem,
  createMediaFailureMessage,
  isMediaAlreadyAttached,
  refreshListingDetail,
} from "./createInventorySubmitMedia";
import {
  attachedUnitDraftIds,
  attachInventoryUnits,
  createUnitFailureMessage,
  ensureInventoryUnitAttached,
  unitIdForDraft,
} from "./createInventorySubmitUnits";

export type { InventoryCreateSubmitProgress } from "./createInventorySubmitTypes";

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

  let unitDraftIds = new Map<string, string>();
  try {
    const attached = await attachInventoryUnits({
      api,
      detail,
      listingId,
      onProgress,
      units: input.units ?? [input.unit],
    });
    detail = attached.detail;
    unitDraftIds = attached.unitDraftIds;
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
        detail = await api.addCost(unitIdForDraft({}, unitDraftIds, detail), {
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
      await attachInventoryCreateMediaItem(
        api,
        unitIdForDraft(item, unitDraftIds, detail),
        item,
      );
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
    const attached = await ensureInventoryUnitAttached({
      api,
      detail,
      form,
      listingId,
      onProgress,
    });
    detail = attached.detail;
  }

  const unitDraftIds = attachedUnitDraftIds(detail);
  const pending = media.filter((item) => {
    const unitId = unitIdForDraft(item, unitDraftIds, detail);
    return !isMediaAlreadyAttached(detail, item, unitId);
  });

  for (const item of pending) {
    onProgress({
      label: `Reenviando midia ${item.displayOrder + 1}/${media.length}`,
    });
    await attachInventoryCreateMediaItem(
      api,
      unitIdForDraft(item, unitDraftIds, detail),
      item,
    );
  }

  detail = await refreshListingDetail(api, listingId, detail);

  return {
    detail,
    kind: "complete",
    listingId,
    mediaCount: media.length,
  };
}
