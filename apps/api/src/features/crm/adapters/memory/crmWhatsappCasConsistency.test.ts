import { describe, expect, it } from "vitest";
import { updateWhatsappSessionWithCas } from "../../../../domains/crm/whatsapp/updateWhatsappSessionWithCas.js";
import { WhatsappSessionRevisionConflictError } from "../../../../domains/crm/whatsapp/whatsappSendErrors.js";
import { createInboundMessage } from "./crmWhatsappConsistency.testSupport.js";
import { createMemoryCrmWhatsappRepository } from "./crmWhatsappRepository.js";

describe("CRM WhatsApp memory CAS consistency", () => {
  it("raises the typed 409 conflict when webhook CAS retries are exhausted", async () => {
    const repository = createMemoryCrmWhatsappRepository();
    const seeded = await repository.ingestMessage(
      createInboundMessage("cas-exhausted"),
    );
    const alwaysConflicting = {
      ...repository,
      updateSession: async () => null,
    };

    await expect(
      updateWhatsappSessionWithCas(alwaysConflicting, {
        initialSession: seeded.session,
        sessionId: seeded.session.id,
        storeId: seeded.session.storeId,
        tenantId: seeded.session.tenantId,
        update: () => ({ lastCustomerReadAt: new Date() }),
      }),
    ).rejects.toBeInstanceOf(WhatsappSessionRevisionConflictError);
  });

  it("reloads after a webhook CAS race and preserves the concurrent mutation", async () => {
    const repository = createMemoryCrmWhatsappRepository();
    const seeded = await repository.ingestMessage(
      createInboundMessage("cas-webhook-1"),
    );
    const initialRevision = seeded.session.revision;
    let raced = false;
    const racingRepository = {
      ...repository,
      updateSession: async (
        input: Parameters<typeof repository.updateSession>[0],
      ) => {
        if (!raced) {
          raced = true;
          if (input.expectedRevision === undefined) {
            throw new Error("CAS revision was not provided.");
          }
          await repository.updateSession({
            assignedUserId: "user-2" as never,
            expectedRevision: input.expectedRevision,
            sessionId: input.sessionId,
            storeId: input.storeId,
            tenantId: input.tenantId,
          });
        }
        return repository.updateSession(input);
      },
    };

    const updated = await updateWhatsappSessionWithCas(racingRepository, {
      initialSession: seeded.session,
      sessionId: seeded.session.id,
      storeId: seeded.session.storeId,
      tenantId: seeded.session.tenantId,
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
