import type { InventoryApi } from "../api/apiClient";
import { createInventoryFlowInput, validateInventoryForm } from "./formModel";
import { uploadInventoryFile } from "./mediaWorkspaceTypes";
import type { CreateMediaDraft } from "./createMediaDrafts";
import type { InventoryFormState } from "./formModel";
import type { InventoryListingDetail } from "./types";

export type InventoryCreateSubmitProgress = {
  label: string;
};

export type InventoryCreateSubmitResult = {
  detail: InventoryListingDetail;
  listingId: string;
  mediaCount: number;
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

  for (const item of media) {
    onProgress({
      label: `Enviando midia ${item.displayOrder + 1}/${media.length}`,
    });
    const upload = await api.requestMediaUpload(listingId, {
      file: item.file,
      kind: item.kind,
    });
    await uploadInventoryFile(item.file, upload);
    await api.createMedia(listingId, {
      altText: item.altText.trim() || item.file.name,
      displayOrder: item.displayOrder,
      kind: item.kind,
      storageKey: upload.storageKey,
    });
  }

  if (media.length > 0) {
    detail = await api.getListing(listingId);
  }

  return { detail, listingId, mediaCount: media.length };
}
