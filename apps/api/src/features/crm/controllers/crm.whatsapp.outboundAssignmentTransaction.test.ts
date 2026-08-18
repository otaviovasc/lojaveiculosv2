import { describe, expect, it, vi } from "vitest";
import type { CrmWhatsappOutboundIntentRepository } from "../../../domains/crm/ports/crmWhatsappOutboundIntentRepository.js";
import type { CrmWhatsappRepository } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { sendWhatsappText } from "../../../domains/crm/services/CrmWhatsapp/sendWhatsappText.js";
import { createTestCrmConnectionRepository } from "../../../domains/crm/testSupportConnections.js";
import { WhatsappSessionNotFoundError } from "../../../domains/crm/whatsapp/whatsappSendErrors.js";
import { createMemoryCrmBotIntegrationRepository } from "../adapters/memory/crmBotIntegrationRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWhatsappOutboundIntentRepository } from "../adapters/memory/crmWhatsappOutboundIntentRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  connection,
  context,
  storeId,
  tenantId,
} from "./crm.whatsapp.outboundIdempotency.testSupport.js";

describe("CRM WhatsApp outbound assignment transaction", () => {
  it("rolls back a newly started intent when a concurrent assignee wins", async () => {
    const repository = createMemoryCrmWhatsappRepository();
    const seeded = await seedInboundSession(repository, "assignment-race");
    let injectConcurrentAssignment = true;
    const racingRepository: CrmWhatsappRepository = {
      ...repository,
      async updateSession(input) {
        if (input.assignedUserId === "user_1" && injectConcurrentAssignment) {
          injectConcurrentAssignment = false;
          await repository.updateSession({
            ...input,
            assignedUserId: "other-user" as never,
          });
          return null;
        }
        return repository.updateSession(input);
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
      sessionId: seeded.session.id,
      text: "hello",
    };

    await expect(
      sendWhatsappText(context(), input, ports),
    ).rejects.toBeInstanceOf(WhatsappSessionNotFoundError);
    expect(sendText).not.toHaveBeenCalled();
    expect(events).toContain("transaction:rollback");

    const [foreignSession] = await repository.listSessions({
      limit: 1,
      offset: 0,
      sessionId: seeded.session.id,
      storeId,
      tenantId,
    });
    expect(foreignSession?.assignedUserId).toBe("other-user");
    await repository.updateSession({
      assignedUserId: null,
      expectedRevision: foreignSession!.revision,
      sessionId: seeded.session.id,
      storeId,
      tenantId,
    });

    await expect(
      sendWhatsappText(context(), input, ports),
    ).resolves.toMatchObject({
      externalId: "provider-after-race",
    });
    expect(sendText).toHaveBeenCalledTimes(1);
  });

  it("commits the intent and assignment before provider dispatch", async () => {
    const repository = createMemoryCrmWhatsappRepository();
    const seeded = await seedInboundSession(repository, "assignment-ordering");
    const events: string[] = [];
    const observingRepository: CrmWhatsappRepository = {
      ...repository,
      async updateSession(input) {
        events.push("assignment:update");
        return repository.updateSession(input);
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

    await sendWhatsappText(
      context(),
      {
        idempotencyKey: "assignment-ordering-key",
        senderOrigin: "human_crm",
        senderType: "HUMAN",
        sessionId: seeded.session.id,
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

async function seedInboundSession(
  repository: CrmWhatsappRepository,
  externalId: string,
) {
  return repository.ingestMessage({
    buyerPhone: "5511999999999",
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
  repository: CrmWhatsappRepository,
  sendText: ReturnType<typeof vi.fn>,
): CrmServicePorts {
  return {
    crmBotIntegrationRepository: createMemoryCrmBotIntegrationRepository(),
    crmConnectionRepository: createTestCrmConnectionRepository([connection()]),
    crmRepository: createMemoryCrmRepository(),
    crmWhatsappGateway: { sendText } as never,
    crmWhatsappOutboundIntentRepository: transactional.repository,
    crmWhatsappRepository: repository,
    transaction: transactional.transaction,
  };
}

function transactionalIntentPorts(
  events: string[],
  getPorts: () => CrmServicePorts,
) {
  let committed = createMemoryCrmWhatsappOutboundIntentRepository();
  const repository: CrmWhatsappOutboundIntentRepository = {
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
    const staged = createMemoryCrmWhatsappOutboundIntentRepository();
    const stagedWithEvidence: CrmWhatsappOutboundIntentRepository = {
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
        crmWhatsappOutboundIntentRepository: stagedWithEvidence,
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
