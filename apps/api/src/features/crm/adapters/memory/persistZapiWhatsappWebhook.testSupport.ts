import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmConnection } from "../../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmWhatsappMessage } from "../../../../domains/crm/ports/crmWhatsappRepository.js";
import type { ParsedZapiInboundMessage } from "../../../../domains/crm/whatsapp/parseZapiInboundMessage.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { createMemoryCrmCanonicalInboundRepository } from "./crmCanonicalInboundRepository.js";

export function projectedMessage(
  value:
    | ReturnType<
        ReturnType<typeof createMemoryCrmCanonicalInboundRepository>["snapshot"]
      >["messages"][number]
    | undefined,
): CrmWhatsappMessage | null {
  if (!value) return null;
  return {
    channel: "WHATSAPP",
    channelMessageId: null,
    connectionId: value.connectionId,
    content: value.content,
    createdAt: value.occurredAt,
    deletedAt: null,
    direction: "INBOUND",
    externalId: value.providerMessageId,
    id: value.id,
    mediaType: value.mediaType,
    mediaUrl: value.mediaUrl,
    metadata: value.metadata as Record<string, unknown>,
    providerTimestamp: value.occurredAt,
    senderOrigin: "customer",
    senderType: "CUSTOMER",
    sessionId: value.cycleId,
    status: "DELIVERED",
    storeId: connection().storeId,
    tenantId: connection().tenantId,
    type: value.messageType.toUpperCase() as CrmWhatsappMessage["type"],
    updatedAt: value.occurredAt,
  };
}

export function context() {
  return createServiceContext({
    actor: { id: "zapi", kind: "integration" },
    permissions: ["crm.whatsapp.ingest"],
    request: { requestId: "request-1" },
    source: { component: "test", service: "api" },
  });
}

export function lead() {
  const now = new Date("2026-08-18T12:00:00.000Z");
  return {
    assignedUserId: null,
    buyerEmail: null,
    buyerName: "Comprador",
    buyerPhone: "5511999999999",
    createdAt: now,
    id: "lead-1",
    lastInteractionAt: now,
    listingId: null,
    metadata: {},
    pipelineId: null,
    pipelineStageId: null,
    source: "whatsapp" as const,
    status: "new" as const,
    storeId: connection().storeId,
    tenantId: connection().tenantId,
    updatedAt: now,
    vehicleTitle: null,
  };
}

export function connection(): CrmConnection {
  return {
    credentialsRef: {},
    displayName: "Z-API",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "connection-1",
    metadata: {},
    phone: "5511999999999",
    provider: "zapi",
    status: "active",
    storeId: "store-1" as StoreId,
    tenantId: "tenant-1" as TenantId,
    webhookUrl: null,
  };
}

export function message(
  overrides: Partial<ParsedZapiInboundMessage> = {},
): ParsedZapiInboundMessage {
  return {
    buyerName: "Comprador",
    chatLid: "lid-1@lid",
    content: "Tenho interesse",
    externalId: "zapi-message-1",
    fromMe: false,
    mediaType: "image",
    metadata: {},
    phone: "5511999999999",
    providerTimestamp: new Date("2026-08-18T12:00:00.000Z"),
    type: "IMAGE",
    ...overrides,
  };
}
