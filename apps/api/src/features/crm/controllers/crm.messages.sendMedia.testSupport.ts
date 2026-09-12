import { vi } from "vitest";
import { Buffer } from "node:buffer";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmAudioNormalizer } from "../../../domains/crm/ports/crmAudioNormalizer.js";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import type {
  ObjectStorage,
  PutStorageObjectInput,
} from "../../../shared/storage/objectStorage.js";

export const mediaTestStoreId = "store_1" as StoreId;
export const mediaTestTenantId = "tenant_1" as TenantId;
export const mediaTestConnectionId = "24000000-0000-4000-8000-000000000101";

export function seedMediaConversationCycle(
  conversationRepository: ReturnType<
    typeof createMemoryCrmConversationRepository
  >,
  suffix: string,
) {
  return conversationRepository.ingestMessage({
    customerDisplayName: "Ana",
    customerPhone: "5511999999999",
    channel: "WHATSAPP",
    connectionId: mediaTestConnectionId,
    content: "Ola",
    direction: "INBOUND",
    externalId: `inbound-media-send-${suffix}`,
    metadata: {},
    providerTimestamp: new Date("2026-07-02T19:00:00.000Z"),
    senderOrigin: "customer",
    senderType: "CUSTOMER",
    status: "DELIVERED",
    storeId: mediaTestStoreId,
    tenantId: mediaTestTenantId,
    type: "TEXT",
  });
}

export function createMediaTestZapiConnection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
  return createConfiguredZapiTestConnection({
    id: mediaTestConnectionId,
    overrides,
    storeId: mediaTestStoreId,
    tenantId: mediaTestTenantId,
  });
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

export function createTestCrmAudioNormalizer(): {
  normalizer: CrmAudioNormalizer;
  normalizeToOggOpus: ReturnType<
    typeof vi.fn<CrmAudioNormalizer["normalizeToOggOpus"]>
  >;
} {
  const normalizeToOggOpus = vi.fn(
    async () => new Uint8Array(Buffer.from("OggS-normalized-audio")),
  );
  return {
    normalizer: { normalizeToOggOpus },
    normalizeToOggOpus,
  };
}
