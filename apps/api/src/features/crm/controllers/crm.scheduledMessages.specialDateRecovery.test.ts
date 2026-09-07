import { describe, expect, it, vi } from "vitest";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createMemoryCrmOutboundIntentRepository } from "../adapters/memory/crmOutboundIntentRepository.js";
import { createMemoryCrmRoutingRepositories } from "../adapters/memory/crmRoutingRepository.js";
import { createMemoryCrmSpecialDateRepository } from "../../../domains/crm/testSupportSpecialDates.js";
import { createCrmServices } from "./crmServices.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import { createTestCrmMessagingGateway } from "./crm.messagingGateway.testSupport.js";

const connectionId = "24000000-0000-4000-8000-000000000601";
const storeId = "store_special_date_recovery" as StoreId;
const tenantId = "tenant_special_date_recovery" as TenantId;
const referenceDate = new Date("2026-09-07T13:00:00.000Z");

describe("CRM special-date scheduler recovery", () => {
  it("requeues, replaces the annual row, and sends the revised payload", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const outboundIntentRepository = createMemoryCrmOutboundIntentRepository();
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
          id: "special-date-recovery-route",
          storeId,
          tenantId,
        },
      ],
    });
    const specialDateRepository = createMemoryCrmSpecialDateRepository({
      birthdayRecipients: [
        {
          key: "lead:revised-special-date",
          name: "Cliente Revisado",
          phone: "5511999994401",
          rawDate: "1995-09-07",
          storeId,
          tenantId,
        },
      ],
      conversationRepository,
      outboundIntentRepository,
    });
    const sendText = vi.fn(async () => ({
      externalId: "special-date-revised-provider-message",
      providerTimestamp: referenceDate,
      raw: {},
    }));
    const services = createCrmServices({
      ports: {
        crmConnectionRepository: connections,
        crmConversationRepository: conversationRepository,
        crmMessagingGateway: createTestCrmMessagingGateway({ sendText }),
        crmOutboundIntentRepository: outboundIntentRepository,
        crmRoutingConnectionRepository: connections.routingConnectionRepository,
        crmRoutingPolicyRepository: routing.policyRepository,
        crmSpecialDateRepository: specialDateRepository,
      },
    });
    const context = createServiceContext({
      actor: { id: "special-date-recovery-worker", kind: "system" },
      entitlements: ["crm"],
      permissions: [
        "crm.messaging.connection.setup",
        "crm.messages.send",
        "crm.scheduled_messages.process",
      ],
      request: { requestId: "special-date-recovery" },
      storeId,
      tenantId,
    });

    await services.updateSpecialDateConfig(context, {
      connectionId,
      dateType: "birthday",
      enabled: true,
      leadDays: 0,
      messageTemplate: "Mensagem inicial, {nome}!",
      sendTime: "09:00",
    });
    const firstEvaluation = await services.evaluateStoreSpecialDates(context, {
      referenceDate,
    });
    expect(firstEvaluation.scheduledMessages).toBe(1);
    const [first] = await conversationRepository.listScheduledMessages({
      limit: 1,
      storeId,
      tenantId,
    });
    if (!first)
      throw new Error("Initial special-date schedule was not created.");

    const claim = await outboundIntentRepository.claim({
      connectionId,
      cycleId: first.cycleId,
      fingerprint: "initial-special-date-payload",
      idempotencyKey: `scheduled:${first.id}`,
      now: new Date(Date.now() - 180_000),
      staleBefore: new Date(Date.now() - 300_000),
      storeId,
      tenantId,
    });
    if (claim.kind !== "claimed")
      throw new Error("Initial intent was not claimed.");
    await outboundIntentRepository.recordProviderFailure({
      claimToken: claim.intent.claimToken,
      failure: { code: "rate_limited" },
      id: claim.intent.id,
      retryable: true,
    });
    const staleSending = await conversationRepository.updateScheduledMessage({
      expectedStatus: "pending",
      id: first.id,
      metadata: { ...first.metadata, scheduledClaimToken: "scheduler-owner" },
      status: "sending",
      storeId,
      tenantId,
      updatedAt: new Date(Date.now() - 180_000),
    });
    expect(staleSending?.status).toBe("sending");

    const revised = await services.updateSpecialDateConfig(context, {
      connectionId,
      dateType: "birthday",
      enabled: true,
      leadDays: 0,
      messageTemplate: "Mensagem revisada, {nome}!",
      sendTime: "09:00",
    });
    const requeued = await services.processDueCrmScheduledMessages(context, {
      dueAt: new Date("2030-01-01T00:00:00.000Z"),
      limit: 10,
    });
    expect(requeued).toMatchObject({ processed: 0, sent: 0 });

    const [pending] = await conversationRepository.listScheduledMessages({
      limit: 1,
      scheduledMessageId: first.id,
      storeId,
      tenantId,
    });
    expect(pending).toMatchObject({ id: first.id, status: "pending" });
    const secondEvaluation = await services.evaluateStoreSpecialDates(context, {
      referenceDate,
    });
    expect(secondEvaluation.scheduledMessages).toBe(1);
    const schedules = await conversationRepository.listScheduledMessages({
      limit: 10,
      storeId,
      tenantId,
    });
    const replacement = schedules.find((message) => message.id !== first.id);
    expect(replacement).toMatchObject({
      content: "Mensagem revisada, Cliente!",
      cycleId: first.cycleId,
      status: "pending",
    });
    expect(replacement?.metadata).toMatchObject({
      specialDate: { configId: revised.id, configRevision: revised.revision },
    });
    expect(schedules.find((message) => message.id === first.id)).toMatchObject({
      status: "cancelled",
    });
    if (!replacement) throw new Error("Replacement schedule was not created.");

    const delivered = await services.processDueCrmScheduledMessages(context, {
      dueAt: new Date("2030-01-01T00:00:00.000Z"),
      limit: 10,
    });
    expect(delivered).toMatchObject({ failed: 0, processed: 1, sent: 1 });
    expect(sendText).toHaveBeenCalledTimes(1);
    const [sent] = await conversationRepository.listScheduledMessages({
      limit: 1,
      scheduledMessageId: replacement.id,
      storeId,
      tenantId,
    });
    expect(sent).toMatchObject({ status: "sent" });
    expect(typeof sent?.sentMessageId).toBe("string");
  });
});
