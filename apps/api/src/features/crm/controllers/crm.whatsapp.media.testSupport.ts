import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { vi } from "vitest";
import type { CrmRemoteMediaFetcher } from "../../../domains/crm/ports/crmRemoteMediaFetcher.js";
import type {
  ObjectStorage,
  PutStorageObjectInput,
} from "../../../shared/storage/objectStorage.js";
import type { createTestApp } from "./crm.whatsapp.controller.testSupport.js";
import {
  createConfiguredZapiTestConnection,
  withTestZapiWebhookToken,
} from "./crm.whatsapp.connectionFixtures.js";

export const mediaTestStoreId = "store_1" as StoreId;
export const mediaTestTenantId = "tenant_1" as TenantId;
export const mediaTestConnectionId = "24000000-0000-4000-8000-000000000101";

export function createZapiMediaTestConnection(
  overrides: Parameters<
    typeof createConfiguredZapiTestConnection
  >[0]["overrides"] = {},
) {
  return createConfiguredZapiTestConnection({
    id: mediaTestConnectionId,
    storeId: mediaTestStoreId,
    tenantId: mediaTestTenantId,
    overrides,
  });
}

export function createRemoteMediaFetcher(
  media: Awaited<ReturnType<CrmRemoteMediaFetcher["fetchMedia"]>> = {
    body: new Uint8Array(),
    contentType: null,
    finalUrl: "https://zapi.test/media",
  },
): CrmRemoteMediaFetcher {
  return {
    fetchMedia: vi.fn(async () => media),
    validateUrl: vi.fn(async () => undefined),
  };
}

export function postImageWebhook(
  app: ReturnType<typeof createTestApp>,
  input: { imageUrl: string; messageId: string },
) {
  return app.request(
    `/api/v1/crm/whatsapp/webhooks/zapi/${mediaTestConnectionId}/received`,
    {
      body: JSON.stringify({
        image: {
          caption: "Foto do carro",
          imageUrl: input.imageUrl,
          mimeType: "image/jpeg",
        },
        messageId: input.messageId,
        phone: "5511999999999",
        senderName: "Ana",
        timestamp: 1783029600,
      }),
      headers: withTestZapiWebhookToken({
        "Content-Type": "application/json",
      }),
      method: "POST",
    },
  );
}

export function createTestObjectStorage(): {
  putObject: ReturnType<
    typeof vi.fn<
      (input: PutStorageObjectInput) => Promise<{
        publicUrl: string;
        storageKey: string;
      }>
    >
  >;
  storage: ObjectStorage;
} {
  const putObject = vi.fn(async (input: PutStorageObjectInput) => ({
    publicUrl: `https://cdn.local/crm-whatsapp/${input.fileName}`,
    storageKey: `crm-whatsapp/${input.fileName}`,
  }));
  return {
    putObject,
    storage: {
      createDownload: vi.fn(),
      createUpload: vi.fn(),
      getPublicUrl: (storageKey) => `https://cdn.local/${storageKey}`,
      putObject,
    },
  };
}
