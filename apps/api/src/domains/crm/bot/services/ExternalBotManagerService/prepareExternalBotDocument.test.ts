import { beforeEach, expect, it, vi } from "vitest";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { createServiceContext } from "../../../../../shared/serviceContext.js";
import { createDisabledCrmMessagingGateway } from "../../../acl/disabledCrmMessagingGateway.js";
import type { ExternalBotEvent } from "../../externalBotModels.js";
import type { ExternalBotDocumentRecoveryPorts } from "../../ports/externalBotDocumentRecovery.js";
import type { CrmMessage } from "../../../ports/crmConversationRepository.js";
import type { CrmConnection } from "../../../ports/crmConnectionRepository.js";
import { prepareExternalBotDocument } from "./prepareExternalBotDocument.js";

const now = new Date("2026-09-08T20:00:00Z");
const tenantId = "tenant" as TenantId;
const storeId = "store" as StoreId;
const event: ExternalBotEvent = {
  id: "event",
  tenantId,
  storeId,
  connectionId: "connection",
  integrationId: "integration",
  threadId: "thread",
  channel: "whatsapp",
  provider: "uazapi",
  modelVersion: "v1",
  actionClass: "effect",
  authorizedRequestDigest: "digest",
  occurredAt: now,
  grant: "grant",
  grantExpiresAt: new Date(now.getTime() + 90_000),
  type: "message_received",
  payload: { channel: "whatsapp", messageRef: "message" },
};
const context = createServiceContext({
  actor: { id: "worker", kind: "system" },
  tenantId,
  storeId,
  permissions: ["crm.bot.events.publish"],
  request: { requestId: "test" },
});
let message: CrmMessage;
let ports: ExternalBotDocumentRecoveryPorts;
const downloadInboundMedia = vi.fn();
const putObject = vi.fn();
const createDownload = vi.fn();
const authorize = vi.fn();
const save = vi.fn<ExternalBotDocumentRecoveryPorts["save"]>();

beforeEach(() => {
  vi.resetAllMocks();
  message = {
    id: "message",
    connectionId: "connection",
    tenantId,
    storeId,
    cycleId: "cycle",
    type: "DOCUMENT",
    mediaType: "document",
    mediaUrl: null,
    metadata: {},
    channel: "WHATSAPP",
    channelMessageId: "provider-id",
    externalId: "provider-id",
    direction: "INBOUND",
    content: "",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    providerTimestamp: now,
    senderOrigin: "customer",
    senderType: "CUSTOMER",
    status: "DELIVERED",
  };
  const connection: CrmConnection = {
    id: "connection",
    tenantId,
    storeId,
    channel: "whatsapp",
    provider: "uazapi",
    broker: "direct",
    credentialsRef: {},
    displayName: "test",
    externalConnectionId: null,
    externalInstanceId: null,
    metadata: {},
    phone: null,
    status: "active",
    webhookUrl: null,
  };
  downloadInboundMedia.mockResolvedValue({
    mediaUrl: "https://provider.test/document.pdf",
    mimeType: "application/pdf",
  });
  putObject.mockResolvedValue({
    publicUrl: "https://cdn.test/stored.pdf",
    storageKey: "crm/tenant/store/file.pdf",
  });
  createDownload.mockResolvedValue({
    downloadUrl: "https://storage.test/signed",
    expiresAt: new Date(now.getTime() + 60_000),
    downloadMethod: "GET",
  });
  authorize.mockResolvedValue(true);
  save.mockImplementation(async (_event, update) => {
    message = { ...message, ...update };
    return true;
  });
  ports = {
    load: async () => ({ message, connection }),
    authorize,
    save,
    gateway: { ...createDisabledCrmMessagingGateway(), downloadInboundMedia },
    fetcher: {
      validateUrl: vi.fn(),
      fetchMedia: vi.fn(async () => ({
        body: new Uint8Array([1, 2]),
        finalUrl: "https://provider.test/document.pdf",
        contentType: "application/pdf",
      })),
    },
    storage: {
      putObject,
      createDownload,
      getPublicUrl: () => "https://cdn.test/stored.pdf",
      createUpload: vi.fn(),
    },
    now: () => now,
  };
});

it("recovers a timeout on the next durable attempt and reuses the persisted object", async () => {
  downloadInboundMedia.mockRejectedValueOnce(new Error("timeout"));
  expect(await prepareExternalBotDocument(context, event, ports)).toEqual({
    kind: "failed",
    code: "document_media_unavailable",
    retryable: true,
  });
  expect(createDownload).not.toHaveBeenCalled();
  const recovered = await prepareExternalBotDocument(context, event, ports);
  expect(recovered).toMatchObject({
    kind: "ready",
    event: {
      document: {
        messageRef: "message",
        downloadUrl: "https://storage.test/signed",
        contentType: "application/pdf",
      },
    },
  });
  expect(putObject).toHaveBeenCalledWith(
    expect.objectContaining({
      idempotencyKey: "provider-id",
      scopeSegments: [
        "crm",
        "whatsapp",
        tenantId,
        storeId,
        "connection",
        "provider-id",
      ],
    }),
  );
  await prepareExternalBotDocument(context, event, ports);
  expect(putObject).toHaveBeenCalledOnce();
  expect(createDownload).toHaveBeenCalledTimes(2);
  expect(event.payload).not.toHaveProperty("mediaUrl");
});

it("does not deliver a provider URL after R2 upload failure", async () => {
  putObject.mockRejectedValue(new Error("R2 unavailable"));
  expect(await prepareExternalBotDocument(context, event, ports)).toMatchObject(
    { kind: "failed", retryable: true },
  );
  expect(createDownload).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
});

it("checks authorization again after downloading before issuing access", async () => {
  authorize.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  expect(await prepareExternalBotDocument(context, event, ports)).toMatchObject(
    { kind: "failed", code: "document_access_denied", retryable: false },
  );
  expect(createDownload).not.toHaveBeenCalled();
});

it("rejects a message from another store before any provider IO", async () => {
  message.storeId = "other-store" as StoreId;
  expect(await prepareExternalBotDocument(context, event, ports)).toMatchObject(
    { kind: "failed", code: "document_scope_mismatch" },
  );
  expect(downloadInboundMedia).not.toHaveBeenCalled();
});

it("refuses access after the grant expires during recovery", async () => {
  ports.now = () => new Date(event.grantExpiresAt.getTime() + 1);
  expect(await prepareExternalBotDocument(context, event, ports)).toMatchObject(
    { kind: "failed", code: "grant_expired", retryable: false },
  );
  expect(createDownload).not.toHaveBeenCalled();
});

it("does not create document links for text events", async () => {
  message.type = "TEXT";
  expect(await prepareExternalBotDocument(context, event, ports)).toEqual({
    kind: "ready",
    event,
  });
  expect(downloadInboundMedia).not.toHaveBeenCalled();
  expect(createDownload).not.toHaveBeenCalled();
});

it("retains retryability when the recovered URL cannot be persisted", async () => {
  save.mockResolvedValue(false);
  expect(await prepareExternalBotDocument(context, event, ports)).toMatchObject(
    { kind: "failed", code: "document_persistence_failed", retryable: true },
  );
  expect(createDownload).not.toHaveBeenCalled();
});
