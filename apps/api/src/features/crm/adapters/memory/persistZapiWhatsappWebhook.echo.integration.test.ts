import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../../domains/crm/ports/crmConnectionRepository.js";
import type {
  CrmMessage,
  CrmMessageSenderOrigin,
} from "../../../../domains/crm/ports/crmConversationRepository.js";
import type { CrmServicePorts } from "../../../../domains/crm/services/CrmService/serviceSupport.js";
import { createTestCrmConversationCycle } from "../../../../domains/crm/testSupportWhatsapp.js";
import { persistZapiWhatsappWebhook } from "../../../../domains/crm/whatsapp/persistZapiWhatsappWebhook.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createMemoryCrmPipelineRepository } from "./crmPipelineRepository.js";
import { createMemoryCrmRepository } from "./crmRepository.js";
import { createMemoryCrmConversationRepository } from "./crmConversationRepository.js";

describe("persistZapiWhatsappWebhook outbound echo attendance", () => {
  it.each([
    ["provider-first bot echo", true, "external_bot", "AI"],
    ["provider-first CRM echo", true, "human_crm", "HUMAN"],
    ["application-first bot echo", false, "external_bot", "AI"],
    ["application-first CRM echo", false, "human_crm", "HUMAN"],
  ] as const)(
    "does not claim human attendance for a reconciled %s",
    async (_label, createdMessage, senderOrigin, senderType) => {
      const repository = createMemoryCrmConversationRepository();
      const cycle = createTestCrmConversationCycle({ leadId: "lead-1" });
      vi.spyOn(repository, "upsertConversationCycleContext").mockResolvedValue(
        cycle,
      );
      vi.spyOn(repository, "ingestMessage").mockResolvedValue({
        createdMessage,
        createdConversationCycle: false,
        message: outboundMessage(senderOrigin, senderType),
        conversationCycle: cycle,
      });
      const transitionAttendance = vi.spyOn(repository, "transitionAttendance");
      const ports = {
        crmPipelineRepository: createMemoryCrmPipelineRepository(),
        crmRepository: createMemoryCrmRepository(),
        crmConversationRepository: repository,
      } satisfies CrmServicePorts;

      const result = await persistZapiWhatsappWebhook(
        context(),
        {
          attribution: null,
          connection: connection(),
          detectedAt: new Date("2026-08-18T12:00:01.000Z"),
          media: { metadata: {} },
          parsed: {
            content: "Resposta",
            externalId: "zapi-message-1",
            fromMe: true,
            metadata: {},
            phone: "5511999999999",
            providerTimestamp: new Date("2026-08-18T12:00:00.000Z"),
            type: "TEXT",
          },
          profilePhoto: { status: "unavailable" },
        },
        ports,
      );

      expect(result.attendanceTransition).toBeNull();
      expect(result.result.message.senderOrigin).toBe(senderOrigin);
      expect(transitionAttendance).not.toHaveBeenCalled();
    },
  );
});

function outboundMessage(
  senderOrigin: CrmMessageSenderOrigin,
  senderType: CrmMessage["senderType"],
): CrmMessage {
  const occurredAt = new Date("2026-08-18T12:00:00.000Z");
  return {
    channel: "WHATSAPP",
    channelMessageId: null,
    connectionId: connection().id,
    content: "Resposta",
    createdAt: occurredAt,
    deletedAt: null,
    direction: "OUTBOUND",
    externalId: "zapi-message-1",
    id: "message-1",
    mediaType: null,
    mediaUrl: null,
    metadata: {},
    providerTimestamp: occurredAt,
    senderOrigin,
    senderType,
    cycleId: "cycle-1",
    status: "SENT",
    storeId: connection().storeId,
    tenantId: connection().tenantId,
    type: "TEXT",
    updatedAt: occurredAt,
  };
}

function context() {
  return createServiceContext({
    actor: { id: "zapi", kind: "integration" },
    permissions: ["crm.messages.ingest"],
    request: { requestId: "request-echo" },
    source: { component: "test", service: "api" },
  });
}

function connection(): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
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
