import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { CrmLead, CrmRepository } from "../ports/crmRepository.js";
import type { CrmConversationRepository } from "../ports/crmConversationRepository.js";
import type { CrmCanonicalInboundRepository } from "../ports/crmCanonicalInboundRepository.js";
import type { CrmWebhookEventRepository } from "../ports/crmWebhookEventRepository.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import { createTestCrmConversationCycle } from "../testSupportWhatsapp.js";
import { createTestCrmPipelineRepository } from "../testSupportPipeline.js";
import { createMemoryCrmPushRepository } from "../testSupportCrmPush.js";
import type { ParsedOlxChatWebhook } from "./parseOlxChatWebhook.js";
import { persistOlxChatWebhook } from "./persistOlxChatWebhook.js";
import { createOlxChatWebhookTestContext as context } from "./persistOlxChatWebhook.testSupport.js";

const storeId = "store-1" as StoreId;
const tenantId = "tenant-1" as TenantId;

describe("persistOlxChatWebhook", () => {
  it("refuses to persist seller echoes as inbound customer messages", () => {
    expect(() =>
      persistOlxChatWebhook(context(), {} as CrmServicePorts, {
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

    const result = await persistOlxChatWebhook(context(), ports, {
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
    expect(
      legacy.crmConversationRepository?.ingestMessage,
    ).not.toHaveBeenCalled();
  });

  it("writes OLX Chat to the canonical provider-scoped thread", async () => {
    const canonical = vi
      .fn()
      .mockResolvedValueOnce({
        attendanceState: "bot_active" as const,
        contactId: "contact-1",
        created: true,
        createdConversationCycle: true,
        cycleId: "cycle-1",
        identityId: "identity-1",
        messageId: "canonical-message-1",
        threadId: "thread-1",
      })
      .mockResolvedValueOnce({
        attendanceState: "bot_active" as const,
        contactId: "contact-1",
        created: false,
        createdConversationCycle: false,
        cycleId: "cycle-1",
        identityId: "identity-1",
        messageId: "canonical-message-1",
        threadId: "thread-1",
      });
    const legacy = createLegacyPorts("customer");
    const pushRepository = createMemoryCrmPushRepository();
    const ports = {
      ...legacy,
      crmPushRepository: pushRepository,
      crmCanonicalInboundRepository: {
        ingestInboundMessage: canonical,
      } satisfies CrmCanonicalInboundRepository,
    };
    const input = {
      connection: connection(),
      parsed: parsed({ origin: "buyer", senderType: "buyer" }),
      providerEventId: "event-1",
    };
    await persistOlxChatWebhook(context(), ports, input);
    await persistOlxChatWebhook(context(), ports, input);
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
    expect(
      legacy.crmConversationRepository?.ingestMessage,
    ).not.toHaveBeenCalled();
    expect(
      legacy.crmConversationRepository?.upsertConversationCycleContext,
    ).not.toHaveBeenCalled();
    expect(legacy.crmRepository.createActivity).toHaveBeenCalledOnce();
    expect(
      legacy.crmWebhookEventRepository?.stageEffects,
    ).toHaveBeenCalledOnce();
    expect(pushRepository.listIntents()).toHaveLength(1);
  });
});

function canonicalResult() {
  return {
    attendanceState: "bot_active" as const,
    contactId: "contact-1",
    created: true,
    createdConversationCycle: true,
    cycleId: "cycle-1",
    identityId: "identity-1",
    messageId: "canonical-message-1",
    threadId: "thread-1",
  };
}

function createLegacyPorts(
  senderOrigin: "customer" | "system" = "system",
): CrmServicePorts {
  const lead = createLead();
  const conversationCycle = createTestCrmConversationCycle({
    channel: "OLX_CHAT",
    connectionId: "connection-1",
    id: "cycle-1",
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
    crmConversationRepository: {
      findMessageByExternalId: vi.fn(
        async () =>
          ({
            channel: "OLX_CHAT",
            content: "Tenho interesse",
            direction: "INBOUND",
            externalId: "message-1",
            id: "canonical-message-1",
            senderOrigin,
            senderType: senderOrigin === "customer" ? "CUSTOMER" : "SYSTEM",
          }) as never,
      ),
      ingestMessage: vi.fn(async () => ({
        createdMessage: false,
        createdConversationCycle: false,
        message: { id: "legacy-message-1" },
        conversationCycle,
      })),
      listConversationCycles: vi.fn(async () => [conversationCycle]),
      upsertConversationCycleContext: vi.fn(async () => conversationCycle),
    } as unknown as CrmConversationRepository,
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
    customerDisplayName: null,
    customerPhone: "5511999999999",
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
    broker: "direct",
    channel: "olx_chat",
    credentialsRef: {},
    displayName: "OLX",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "connection-1",
    metadata: {},
    phone: null,
    provider: "olx",
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
    metadata: { crmMessaging: { firstMessageExternalId: "message-0" } },
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
