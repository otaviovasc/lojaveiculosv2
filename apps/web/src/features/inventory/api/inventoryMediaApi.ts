import { createInventoryHeaders, inventoryRoutes } from "./apiRoutes";
import { readApiJson } from "../../../lib/apiErrors";
import type {
  AttachInventoryDocumentInput,
  CreateInventoryMediaInput,
  InventoryAuth,
  InventoryListingDetail,
  InventoryMediaRecord,
  InventoryMediaUpload,
  InventoryDocumentAccess,
  UpdateInventoryMediaInput,
} from "../model/types";

type JsonBody = Record<string, unknown>;
export type SendJson = <T>(
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
    unitId: string,
    input: CreateInventoryMediaInput & { file: File },
  ) =>
    postJson<InventoryMediaUpload>(
      inventoryRoutes.mediaUploads(unitId, baseUrl),
      mediaUploadBody(input.file, { kind: input.kind }),
    );

  const createMedia = (
    unitId: string,
    input: CreateInventoryMediaInput & { storageKey: string },
  ) =>
    postJson<InventoryMediaRecord>(inventoryRoutes.media(unitId, baseUrl), {
      altText: input.altText,
      displayOrder: input.displayOrder,
      kind: input.kind,
      storageKey: input.storageKey,
    });

  const updateMedia = (
    unitId: string,
    mediaId: string,
    input: UpdateInventoryMediaInput,
  ) =>
    sendJson<InventoryListingDetail>(
      inventoryRoutes.mediaDetail(unitId, mediaId, baseUrl),
      input,
      "PATCH",
    );

  const deleteMedia = (unitId: string, mediaId: string) =>
    fetch(inventoryRoutes.mediaDetail(unitId, mediaId, baseUrl), {
      headers: createInventoryHeaders(auth),
      method: "DELETE",
    }).then((response) =>
      readApiJson<InventoryListingDetail>(response, {
        feature: "Inventory",
      }),
    );

  const reorderMedia = (
    unitId: string,
    items: ReadonlyArray<{ displayOrder: number; mediaId: string }>,
  ) =>
    sendJson<InventoryListingDetail>(
      inventoryRoutes.mediaReorder(unitId, baseUrl),
      { items },
      "PATCH",
    );

  const requestUnitDocumentUpload = (
    unitId: string,
    input: { file: File; kind: AttachInventoryDocumentInput["kind"] },
  ) =>
    postJson<InventoryMediaUpload>(
      inventoryRoutes.unitDocumentUploads(unitId, baseUrl),
      mediaUploadBody(input.file, {
        kind: input.kind,
      }),
    );

  const attachUnitDocument = (
    unitId: string,
    input: AttachInventoryDocumentInput,
  ) =>
    postJson<InventoryListingDetail>(
      inventoryRoutes.unitDocuments(unitId, baseUrl),
      {
        fileName: input.fileName,
        fileSizeBytes: input.fileSizeBytes,
        kind: input.kind,
        mimeType: input.mimeType,
        storageKey: input.storageKey,
        title: input.title,
      },
    );

  const getDocumentAccess = (
    documentId: string,
    disposition: "attachment" | "inline",
  ) =>
    fetch(inventoryRoutes.documentDownload(documentId, disposition, baseUrl), {
      headers: createInventoryHeaders(auth),
    }).then((response) =>
      readApiJson<InventoryDocumentAccess>(response, { feature: "Inventory" }),
    );

  return {
    attachUnitDocument,
    createMedia,
    deleteMedia,
    getDocumentAccess,
    reorderMedia,
    requestUnitDocumentUpload,
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
