import { describe, expect, it, vi } from "vitest";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createMemoryCrmRoutingRepositories } from "../adapters/memory/crmRoutingRepository.js";
import { createTestCrmMessagingGateway } from "./crm.messagingGateway.testSupport.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import { createCrmServices } from "./crmServices.js";
import { createMemoryCrmSpecialDateRepository } from "../../../domains/crm/testSupportSpecialDates.js";

const connectionId = "24000000-0000-4000-8000-000000000501";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const referenceDate = new Date("2026-09-07T13:00:00.000Z");

describe("CRM special-date scheduled delivery", () => {
  it("evaluates an eligible birthday and delivers it once through the worker", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const connections = createMemoryCrmConnectionRepository([
      createConfiguredZapiTestConnection({
        id: connectionId,
        storeId,
        tenantId,
      }),
    ]);
    const routing = createMemoryCrmRoutingRepositories({
      policies: [
        {
          channel: "whatsapp",
          defaultConnectionId: connectionId,
          externalBotConnectionId: null,
          externalBotMode: "disabled",
          id: "special-date-whatsapp-default",
          storeId,
          tenantId,
        },
      ],
    });
    const specialDateRepository = createMemoryCrmSpecialDateRepository({
      birthdayRecipients: [
        {
          key: "lead:birthday-1",
          name: "Lucas Mendes",
          phone: "5511999991111",
          rawDate: "1995-09-07",
          storeId,
          tenantId,
        },
      ],
      conversationRepository,
    });
    const sendText = vi.fn(async () => ({
      externalId: "special-date-provider-message",
      providerTimestamp: referenceDate,
      raw: {},
    }));
    const services = createCrmServices({
      ports: {
        crmConnectionRepository: connections,
        crmConversationRepository: conversationRepository,
        crmMessagingGateway: createTestCrmMessagingGateway({ sendText }),
        crmRoutingConnectionRepository: connections.routingConnectionRepository,
        crmRoutingPolicyRepository: routing.policyRepository,
        crmSpecialDateRepository: specialDateRepository,
      },
    });
    const context = createServiceContext({
      actor: { id: "crm_schedule_worker", kind: "system" },
      entitlements: ["crm"],
      permissions: [
        "crm.messaging.connection.setup",
        "crm.scheduled_messages.process",
        "crm.messages.send",
      ],
      request: { requestId: "special-date-e2e" },
      storeId,
      tenantId,
    });

    const enabled = await services.updateSpecialDateConfig(context, {
      connectionId,
      dateType: "birthday",
      enabled: true,
      leadDays: 0,
      messageTemplate: "Parabéns, {nome}!",
      sendTime: "09:00",
    });
    expect(enabled.enabled).toBe(true);

    const evaluation = await services.evaluateConfiguredSpecialDates(context, {
      referenceDate,
    });
    expect(evaluation).toMatchObject({
      scheduledMessages: 1,
      scopes: 1,
    });

    const repeatedEvaluation = await services.evaluateConfiguredSpecialDates(
      context,
      { referenceDate },
    );
    expect(repeatedEvaluation.scheduledMessages).toBe(0);

    const processed = await services.processDueCrmScheduledMessages(context, {
      dueAt: referenceDate,
      limit: 10,
    });
    expect(processed).toMatchObject({ processed: 1, sent: 1, failed: 0 });
    expect(sendText).toHaveBeenCalledTimes(1);

    const [sent] = await conversationRepository.listScheduledMessages({
      limit: 10,
      status: "sent",
      storeId,
      tenantId,
    });
    expect(sent).toMatchObject({
      connectionId,
      status: "sent",
    });
    expect(sent?.sentMessageId).toBeTruthy();
    const persistedOutbound = sent?.sentMessageId
      ? await conversationRepository.findMessageById({
          messageId: sent.sentMessageId,
          storeId,
          tenantId,
        })
      : null;
    expect(persistedOutbound).toMatchObject({
      externalId: "special-date-provider-message",
      status: "SENT",
    });

    const repeatedProcess = await services.processDueCrmScheduledMessages(
      context,
      { dueAt: referenceDate, limit: 10 },
    );
    expect(repeatedProcess).toMatchObject({ processed: 0, sent: 0 });
    expect(sendText).toHaveBeenCalledTimes(1);
  });
});
