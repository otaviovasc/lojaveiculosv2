import { createInventoryHeaders, inventoryRoutes } from "./apiRoutes";
import type {
  AttachInventoryDocumentInput,
  CreateInventoryMediaInput,
  InventoryAuth,
  InventoryListingDetail,
  InventoryMediaRecord,
  InventoryMediaUpload,
  UpdateInventoryMediaInput,
} from "../model/types";

type JsonBody = Record<string, unknown>;
type SendJson = <T>(
  route: string,
  body: JsonBody,
  method?: string,
) => Promise<T>;
type PostJson = <T>(route: string, body: JsonBody) => Promise<T>;

export type InventoryMediaApi = ReturnType<typeof createInventoryMediaApi>;

export function createInventoryMediaApi({
  auth,
  baseUrl,
  fetch,
  postJson,
  sendJson,
}: {
  auth: InventoryAuth;
  baseUrl?: string;
  fetch: typeof window.fetch;
  postJson: PostJson;
  sendJson: SendJson;
}) {
  const requestMediaUpload = (
    listingId: string,
    input: CreateInventoryMediaInput & { file: File },
  ) =>
    postJson<InventoryMediaUpload>(
      inventoryRoutes.mediaUploads(listingId, baseUrl),
      mediaUploadBody(input.file, { kind: input.kind }),
    );

  const createMedia = (
    listingId: string,
    input: CreateInventoryMediaInput & { storageKey: string },
  ) =>
    postJson<InventoryMediaRecord>(inventoryRoutes.media(listingId, baseUrl), {
      altText: input.altText,
      displayOrder: input.displayOrder,
      kind: input.kind,
      storageKey: input.storageKey,
    });

  const updateMedia = (
    listingId: string,
    mediaId: string,
    input: UpdateInventoryMediaInput,
  ) =>
    sendJson<InventoryListingDetail>(
      inventoryRoutes.mediaDetail(listingId, mediaId, baseUrl),
      input,
      "PATCH",
    );

  const deleteMedia = (listingId: string, mediaId: string) =>
    fetch(inventoryRoutes.mediaDetail(listingId, mediaId, baseUrl), {
      headers: createInventoryHeaders(auth),
      method: "DELETE",
    }).then(readInventoryJson<InventoryListingDetail>);

  const reorderMedia = (
    listingId: string,
    items: ReadonlyArray<{ displayOrder: number; mediaId: string }>,
  ) =>
    sendJson<InventoryListingDetail>(
      inventoryRoutes.mediaReorder(listingId, baseUrl),
      { items },
      "PATCH",
    );

  const requestDocumentUpload = (
    listingId: string,
    input: { file: File; targetId?: string; targetType?: string },
  ) =>
    postJson<InventoryMediaUpload>(
      inventoryRoutes.documentUploads(listingId, baseUrl),
      mediaUploadBody(input.file, {
        targetId: input.targetId,
        targetType: input.targetType,
      }),
    );

  const attachDocument = (
    listingId: string,
    input: AttachInventoryDocumentInput,
  ) =>
    postJson<InventoryListingDetail>(
      inventoryRoutes.documents(listingId, baseUrl),
      {
        fileName: input.fileName,
        fileSizeBytes: input.fileSizeBytes,
        kind: input.kind,
        mimeType: input.mimeType,
        storageKey: input.storageKey,
        targetId: input.targetId,
        targetType: input.targetType,
        title: input.title,
      },
    );

  return {
    attachDocument,
    createMedia,
    deleteMedia,
    reorderMedia,
    requestDocumentUpload,
    requestMediaUpload,
    updateMedia,
  };
}

function mediaUploadBody(file: File, extra: JsonBody) {
  return {
    contentType: file.type || "application/octet-stream",
    fileName: file.name,
    sizeBytes: file.size,
    ...extra,
  };
}

async function readInventoryJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Inventory request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}
