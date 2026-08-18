import { describe, expect, it } from "vitest";
import { updateConversationCycleWithCas } from "../../../../domains/crm/messaging/updateConversationCycleWithCas.js";
import { ConversationCycleRevisionConflictError } from "../../../../domains/crm/messaging/crmMessagingErrors.js";
import { createInboundMessage } from "./crmConversationConsistency.testSupport.js";
import { createMemoryCrmConversationRepository } from "./crmConversationRepository.js";

describe("CRM conversation memory CAS consistency", () => {
  it("raises the typed 409 conflict when webhook CAS retries are exhausted", async () => {
    const repository = createMemoryCrmConversationRepository();
    const seeded = await repository.ingestMessage(
      createInboundMessage("cas-exhausted"),
    );
    const alwaysConflicting = {
      ...repository,
      updateConversationCycle: async () => null,
    };

    await expect(
      updateConversationCycleWithCas(alwaysConflicting, {
        initialSession: seeded.conversationCycle,
        cycleId: seeded.conversationCycle.id,
        storeId: seeded.conversationCycle.storeId,
        tenantId: seeded.conversationCycle.tenantId,
        update: () => ({ lastCustomerReadAt: new Date() }),
      }),
    ).rejects.toBeInstanceOf(ConversationCycleRevisionConflictError);
  });

  it("reloads after a webhook CAS race and preserves the concurrent mutation", async () => {
    const repository = createMemoryCrmConversationRepository();
    const seeded = await repository.ingestMessage(
      createInboundMessage("cas-webhook-1"),
    );
    const initialRevision = seeded.conversationCycle.revision;
    let raced = false;
    const racingRepository = {
      ...repository,
      updateConversationCycle: async (
        input: Parameters<typeof repository.updateConversationCycle>[0],
      ) => {
        if (!raced) {
          raced = true;
          if (input.expectedRevision === undefined) {
            throw new Error("CAS revision was not provided.");
          }
          await repository.updateConversationCycle({
            assignedUserId: "user-2" as never,
            expectedRevision: input.expectedRevision,
            cycleId: input.cycleId,
            storeId: input.storeId,
            tenantId: input.tenantId,
          });
        }
        return repository.updateConversationCycle(input);
      },
    };

    const updated = await updateConversationCycleWithCas(racingRepository, {
      initialSession: seeded.conversationCycle,
      cycleId: seeded.conversationCycle.id,
      storeId: seeded.conversationCycle.storeId,
      tenantId: seeded.conversationCycle.tenantId,
      update: () => ({
        lastCustomerReadAt: new Date("2026-08-10T15:01:00.000Z"),
      }),
    });

    expect(updated).toMatchObject({
      assignedUserId: "user-2",
      lastCustomerReadAt: new Date("2026-08-10T15:01:00.000Z"),
      revision: initialRevision + 2,
    });
  });
});
