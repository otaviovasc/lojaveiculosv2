import { describe, expect, it, vi } from "vitest";
import type { CrmOutboundIntentRepository } from "../../../domains/crm/ports/crmOutboundIntentRepository.js";
import type { CrmConversationRepository } from "../../../domains/crm/ports/crmConversationRepository.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { sendMessage } from "../../../domains/crm/services/CrmMessagingService/sendMessage.js";
import { createTestCrmConnectionRepository } from "../../../domains/crm/testSupportConnections.js";
import { createTestCrmRoutingPorts } from "../../../domains/crm/testSupportConnections.js";
import { ConversationCycleNotFoundError } from "../../../domains/crm/messaging/crmMessagingErrors.js";
import { createMemoryCrmExternalBotIntegrationRepository } from "../adapters/memory/crmExternalBotIntegrationRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmOutboundIntentRepository } from "../adapters/memory/crmOutboundIntentRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import {
  connection,
  context,
  storeId,
  tenantId,
} from "./crm.messages.outboundIdempotency.testSupport.js";

describe("CRM outbound assignment transaction", () => {
  it("rolls back a newly started intent when a concurrent assignee wins", async () => {
    const repository = createMemoryCrmConversationRepository();
    const seeded = await seedInboundCycle(repository, "assignment-race");
    let injectConcurrentAssignment = true;
    const racingRepository: CrmConversationRepository = {
      ...repository,
      async updateConversationCycle(input) {
        if (input.assignedUserId === "user_1" && injectConcurrentAssignment) {
          injectConcurrentAssignment = false;
          await repository.updateConversationCycle({
            ...input,
            assignedUserId: "other-user" as never,
          });
          return null;
        }
        return repository.updateConversationCycle(input);
      },
    };
    const sendText = vi.fn(async () => ({
      externalId: "provider-after-race",
      providerTimestamp: new Date("2026-08-18T12:00:00.000Z"),
    }));
    const events: string[] = [];
    let ports: CrmServicePorts;
    const transactional = transactionalIntentPorts(events, () => ports);
    ports = outboundPorts(transactional, racingRepository, sendText);
    const input = {
      idempotencyKey: "assignment-race-key",
      senderOrigin: "human_crm" as const,
      senderType: "HUMAN" as const,
      cycleId: seeded.conversationCycle.id,
      text: "hello",
    };

    await expect(sendMessage(context(), input, ports)).rejects.toBeInstanceOf(
      ConversationCycleNotFoundError,
    );
    expect(sendText).not.toHaveBeenCalled();
    expect(events).toContain("transaction:rollback");

    const [foreignCycle] = await repository.listConversationCycles({
      limit: 1,
      offset: 0,
      cycleId: seeded.conversationCycle.id,
      storeId,
      tenantId,
    });
    expect(foreignCycle?.assignedUserId).toBe("other-user");
    await repository.updateConversationCycle({
      assignedUserId: null,
      expectedRevision: foreignCycle!.revision,
      cycleId: seeded.conversationCycle.id,
      storeId,
      tenantId,
    });

    await expect(sendMessage(context(), input, ports)).resolves.toMatchObject({
      externalId: "provider-after-race",
    });
    expect(sendText).toHaveBeenCalledTimes(1);
  });

  it("commits the intent and assignment before provider dispatch", async () => {
    const repository = createMemoryCrmConversationRepository();
    const seeded = await seedInboundCycle(repository, "assignment-ordering");
    const events: string[] = [];
    const observingRepository: CrmConversationRepository = {
      ...repository,
      async updateConversationCycle(input) {
        events.push("assignment:update");
        return repository.updateConversationCycle(input);
      },
    };
    const sendText = vi.fn(async () => {
      events.push("provider:send");
      return {
        externalId: "provider-after-commit",
        providerTimestamp: new Date("2026-08-18T12:00:00.000Z"),
      };
    });
    let ports: CrmServicePorts;
    const transactional = transactionalIntentPorts(events, () => ports);
    ports = outboundPorts(transactional, observingRepository, sendText);

    await sendMessage(
      context(),
      {
        idempotencyKey: "assignment-ordering-key",
        senderOrigin: "human_crm",
        senderType: "HUMAN",
        cycleId: seeded.conversationCycle.id,
        text: "hello",
      },
      ports,
    );

    expect(events.slice(0, 5)).toEqual([
      "transaction:start",
      "intent:claim",
      "assignment:update",
      "transaction:commit",
      "provider:send",
    ]);
  });
});

async function seedInboundCycle(
  repository: CrmConversationRepository,
  externalId: string,
) {
  return repository.ingestMessage({
    customerPhone: "5511999999999",
    channel: "WHATSAPP",
    connectionId: "connection_1",
    content: "inbound",
    direction: "INBOUND",
    externalId,
    metadata: {},
    providerTimestamp: new Date("2026-08-18T11:00:00.000Z"),
    senderOrigin: "customer",
    senderType: "CUSTOMER",
    status: "DELIVERED",
    storeId,
    tenantId,
    type: "TEXT",
  });
}

function outboundPorts(
  transactional: ReturnType<typeof transactionalIntentPorts>,
  repository: CrmConversationRepository,
  sendText: ReturnType<typeof vi.fn>,
): CrmServicePorts {
  return {
    crmAssigneeMembershipRepository: activeMembershipRepository(),
    crmExternalBotIntegrationRepository:
      createMemoryCrmExternalBotIntegrationRepository(),
    crmConnectionRepository: createTestCrmConnectionRepository([connection()]),
    ...createTestCrmRoutingPorts([connection()]),
    crmRepository: createMemoryCrmRepository(),
    crmMessagingGateway: { sendText } as never,
    crmOutboundIntentRepository: transactional.repository,
    crmConversationRepository: repository,
    transaction: transactional.transaction,
  };
}

function activeMembershipRepository() {
  return { isActiveStoreMember: async () => true };
}

function transactionalIntentPorts(
  events: string[],
  getPorts: () => CrmServicePorts,
) {
  let committed = createMemoryCrmOutboundIntentRepository();
  const repository: CrmOutboundIntentRepository = {
    claim: (input) => committed.claim(input),
    complete: (input) => committed.complete(input),
    markIndeterminate: (input) => committed.markIndeterminate(input),
    purgeExpiredRecoveryPayloads: (input) =>
      committed.purgeExpiredRecoveryPayloads(input),
    recordProviderFailure: (input) => committed.recordProviderFailure(input),
    recordProviderSuccess: (input) => committed.recordProviderSuccess(input),
  };
  const transaction: NonNullable<CrmServicePorts["transaction"]> = async (
    action,
  ) => {
    events.push("transaction:start");
    const staged = createMemoryCrmOutboundIntentRepository();
    const stagedWithEvidence: CrmOutboundIntentRepository = {
      ...staged,
      async claim(input) {
        events.push("intent:claim");
        return staged.claim(input);
      },
    };
    try {
      const { transaction: _transaction, ...transactionPorts } = getPorts();
      const result = await action({
        ...transactionPorts,
        crmOutboundIntentRepository: stagedWithEvidence,
      });
      committed = staged;
      events.push("transaction:commit");
      return result;
    } catch (error) {
      events.push("transaction:rollback");
      throw error;
    }
  };
  return { repository, transaction };
}
