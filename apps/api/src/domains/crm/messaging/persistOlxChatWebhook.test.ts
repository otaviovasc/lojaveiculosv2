import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { CrmLead, CrmRepository } from "../ports/crmRepository.js";
import type { CrmWhatsappRepository } from "../ports/crmWhatsappRepository.js";
import type { CrmCanonicalInboundRepository } from "../ports/crmCanonicalInboundRepository.js";
import type { CrmWebhookEventRepository } from "../ports/crmWebhookEventRepository.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import { createTestCrmWhatsappSession } from "../testSupportWhatsapp.js";
import { createTestCrmPipelineRepository } from "../testSupportPipeline.js";
import type { ParsedOlxChatWebhook } from "./parseOlxChatWebhook.js";
import { persistOlxChatWebhook } from "./persistOlxChatWebhook.js";

const storeId = "store-1" as StoreId;
const tenantId = "tenant-1" as TenantId;

describe("persistOlxChatWebhook", () => {
  it("refuses to persist seller echoes as inbound customer messages", () => {
    expect(() =>
      persistOlxChatWebhook({} as CrmServicePorts, {
        connection: connection(),
        parsed: parsed({ origin: "seller", senderType: "account" }),
        providerEventId: "event-1",
      }),
    ).toThrow("Only buyer-origin OLX Chat messages can be persisted.");
  });

  it("keeps system sender semantics while buyer origin controls direction", async () => {
    const canonical = vi.fn(async () => canonicalResult());
    const legacy = createLegacyPorts();
    const ports = {
      ...legacy,
      crmCanonicalInboundRepository: { ingestInboundMessage: canonical },
    } satisfies CrmServicePorts;

    const result = await persistOlxChatWebhook(ports, {
      connection: connection(),
      parsed: parsed({ origin: "buyer", senderType: "system" }),
      providerEventId: "event-1",
    });
    expect(canonical).toHaveBeenCalledWith(
      expect.objectContaining({
        sender: "system",
      }),
    );
    expect(result.message).toMatchObject({
      direction: "INBOUND",
      senderOrigin: "system",
      senderType: "SYSTEM",
    });
    expect(legacy.crmWhatsappRepository?.ingestMessage).not.toHaveBeenCalled();
  });

  it("writes OLX Chat to the canonical provider-scoped thread", async () => {
    const canonical = vi
      .fn()
      .mockResolvedValueOnce({
        attendanceState: "bot_active" as const,
        contactId: "contact-1",
        created: true,
        createdSession: true,
        cycleId: "cycle-1",
        identityId: "identity-1",
        messageId: "canonical-message-1",
        threadId: "thread-1",
      })
      .mockResolvedValueOnce({
        attendanceState: "bot_active" as const,
        contactId: "contact-1",
        created: false,
        createdSession: false,
        cycleId: "cycle-1",
        identityId: "identity-1",
        messageId: "canonical-message-1",
        threadId: "thread-1",
      });
    const legacy = createLegacyPorts();
    const ports = {
      ...legacy,
      crmCanonicalInboundRepository: {
        ingestInboundMessage: canonical,
      } satisfies CrmCanonicalInboundRepository,
    };
    const input = {
      connection: connection(),
      parsed: parsed({ origin: "buyer", senderType: "buyer" }),
      providerEventId: "event-1",
    };
    await persistOlxChatWebhook(ports, input);
    await persistOlxChatWebhook(ports, input);
    expect(canonical).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "olx_chat",
        connectionId: "connection-1",
        externalThreadId: "chat-1",
        identity: {
          kind: "provider_subject",
          normalizedValue: "olx:connection-1:chat-1",
        },
        provider: "olx",
        providerMessageId: "message-1",
      }),
    );
    expect(legacy.crmWhatsappRepository?.ingestMessage).not.toHaveBeenCalled();
    expect(
      legacy.crmWhatsappRepository?.upsertSessionContext,
    ).not.toHaveBeenCalled();
    expect(legacy.crmRepository.createActivity).toHaveBeenCalledOnce();
    expect(
      legacy.crmWebhookEventRepository?.stageEffects,
    ).toHaveBeenCalledOnce();
  });
});

function canonicalResult() {
  return {
    attendanceState: "bot_active" as const,
    contactId: "contact-1",
    created: true,
    createdSession: true,
    cycleId: "cycle-1",
    identityId: "identity-1",
    messageId: "canonical-message-1",
    threadId: "thread-1",
  };
}

function createLegacyPorts(): CrmServicePorts {
  const lead = createLead();
  const session = createTestCrmWhatsappSession({
    channel: "OLX_CHAT",
    connectionId: "connection-1",
    leadId: lead.id,
    storeId,
    tenantId,
  });
  return {
    crmPipelineRepository: createTestCrmPipelineRepository(),
    crmRepository: {
      createActivity: vi.fn(async () => ({})),
      createLead: vi.fn(async () => lead),
      findLeadByPhone: vi.fn(async () => null),
      findLeadById: vi.fn(async () => lead),
      updateLead: vi.fn(async () => lead),
    } as unknown as CrmRepository,
    crmWhatsappRepository: {
      ingestMessage: vi.fn(async () => ({
        createdMessage: false,
        createdSession: false,
        message: { id: "legacy-message-1" },
        session,
      })),
      upsertSessionContext: vi.fn(async () => session),
    } as unknown as CrmWhatsappRepository,
    crmWebhookEventRepository: {
      stageEffects: vi.fn(async () => undefined),
    } as unknown as CrmWebhookEventRepository,
  };
}

function parsed(
  direction:
    | { origin: "buyer"; senderType: "account" | "buyer" | "system" }
    | { origin: "seller"; senderType: "account" | "system" },
): ParsedOlxChatWebhook {
  return {
    buyerEmail: null,
    buyerName: null,
    buyerPhone: "5511999999999",
    chatId: "chat-1",
    externalMessageId: "message-1",
    listId: "listing-1",
    message: "Tenho interesse",
    timestamp: new Date("2026-08-10T12:00:00.000Z"),
    ...direction,
  };
}

function connection(): CrmConnection {
  return {
    credentialsRef: {},
    displayName: "OLX",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "connection-1",
    metadata: {},
    phone: null,
    provider: "olx_chat",
    status: "active",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}

function createLead(): CrmLead {
  const now = new Date("2026-08-10T12:00:00.000Z");
  return {
    assignedUserId: null,
    buyerEmail: null,
    buyerName: null,
    buyerPhone: "5511999999999",
    createdAt: now,
    id: "lead-1",
    lastInteractionAt: now,
    listingId: null,
    metadata: { crmWhatsapp: { firstMessageExternalId: "message-0" } },
    pipelineId: null,
    pipelineStageId: null,
    source: "olx",
    status: "new",
    storeId,
    tenantId,
    updatedAt: now,
    vehicleTitle: null,
  };
}
