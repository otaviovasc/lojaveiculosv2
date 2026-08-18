import { describe, expect, it, vi } from "vitest";
import type { CrmConversationRepository } from "../../../domains/crm/ports/crmConversationRepository.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { createMemoryCrmPipelineRepository } from "../adapters/memory/crmPipelineRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import {
  createTestApp,
  defaultWhatsappPermissions,
} from "./crm.controller.testSupport.js";
import {
  findStartConversationCycle as findCycle,
  listStartConversationMessages as listMessages,
  requestAuthorizedStartConversation as start,
  restrictedStartPermissions as restrictedPermissions,
  seedStartConversationCycle as seedCycle,
  startActorUserId as actorUserId,
  startConversationConnections as connections,
  startConversationProviderResult as providerResult,
  startOtherUserId as otherUserId,
  startStoreId as storeId,
  startTenantId as tenantId,
} from "./crm.conversationCycles.start.authorization.testSupport.js";

describe("CRM start conversation authorization", () => {
  it("returns 404 without a provider call for another user's cycle", async () => {
    const repository = createMemoryCrmConversationRepository();
    await seedCycle(repository, otherUserId);
    const sendText = vi.fn(async () => providerResult("foreign-provider"));
    const app = createTestApp({
      crmConnectionRepository: connections(),
      crmMessagingGateway: { sendText },
      crmConversationRepository: repository,
      permissions: restrictedPermissions,
    });

    const response = await start(app);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_MESSAGING_NOT_FOUND",
    });
    expect(sendText).not.toHaveBeenCalled();
  });

  it("claims an existing unassigned cycle before the provider call", async () => {
    const repository = createMemoryCrmConversationRepository();
    const crmRepository = createMemoryCrmRepository();
    const crmPipelineRepository = createMemoryCrmPipelineRepository();
    const seeded = await seedCycle(repository, null);
    const events: string[] = [];
    const findConversationCycleByIdentity =
      repository.findConversationCycleByIdentity.bind(repository);
    repository.findConversationCycleByIdentity = vi.fn(async (input) => {
      events.push("resolve");
      return findConversationCycleByIdentity(input);
    });
    const updateConversationCycle =
      repository.updateConversationCycle.bind(repository);
    repository.updateConversationCycle = vi.fn(
      async (
        input: Parameters<
          CrmConversationRepository["updateConversationCycle"]
        >[0],
      ) => {
        if (input.assignedUserId === actorUserId) events.push("claim");
        return updateConversationCycle(input);
      },
    );
    const ingestMessage = repository.ingestMessage.bind(repository);
    repository.ingestMessage = vi.fn(async (input) => {
      events.push("ingest");
      return ingestMessage(input);
    });
    const sendText = vi.fn(async () => {
      const current = await findCycle(repository, seeded.conversationCycle.id);
      events.push("provider");
      expect(current?.assignedUserId).toBe(actorUserId);
      return providerResult("claimed-before-provider");
    });
    const transaction: NonNullable<CrmServicePorts["transaction"]> = async (
      action,
    ) => {
      events.push("transaction:start");
      const result = await action({
        crmPipelineRepository,
        crmRepository,
        crmConversationRepository: repository,
      });
      events.push("transaction:commit");
      return result;
    };
    const app = createTestApp({
      crmConnectionRepository: connections(),
      crmPipelineRepository,
      crmRepository,
      crmMessagingGateway: { sendText },
      crmConversationRepository: repository,
      permissions: restrictedPermissions,
      transaction,
    });

    const response = await start(app);

    expect(response.status).toBe(201);
    expect(events.slice(0, events.indexOf("provider") + 1).join(" ")).toBe(
      "transaction:start resolve claim ingest transaction:commit provider",
    );
    const [lead] = await crmRepository.listLeads({
      limit: 10,
      storeId,
      tenantId,
    });
    expect(lead?.assignedUserId).toBe(actorUserId);
  });

  it("does not steal when another user wins a concurrent claim", async () => {
    const repository = createMemoryCrmConversationRepository();
    const crmRepository = createMemoryCrmRepository();
    const seeded = await seedCycle(repository, null);
    const messagesBefore = await listMessages(
      repository,
      seeded.conversationCycle.id,
    );
    const updateConversationCycle =
      repository.updateConversationCycle.bind(repository);
    let injectConcurrentClaim = true;
    repository.updateConversationCycle = vi.fn(
      async (
        input: Parameters<
          CrmConversationRepository["updateConversationCycle"]
        >[0],
      ) => {
        if (input.assignedUserId === actorUserId && injectConcurrentClaim) {
          injectConcurrentClaim = false;
          await updateConversationCycle({
            assignedUserId: otherUserId as never,
            ...(input.expectedRevision !== undefined
              ? { expectedRevision: input.expectedRevision }
              : {}),
            cycleId: input.cycleId,
            storeId: input.storeId,
            tenantId: input.tenantId,
          });
        }
        return updateConversationCycle(input);
      },
    );
    const sendText = vi.fn(async () => providerResult("concurrent-provider"));
    const app = createTestApp({
      crmConnectionRepository: connections(),
      crmRepository,
      crmMessagingGateway: { sendText },
      crmConversationRepository: repository,
      permissions: restrictedPermissions,
    });

    const response = await start(app);

    expect(response.status).toBe(404);
    expect(
      (await findCycle(repository, seeded.conversationCycle.id))
        ?.assignedUserId,
    ).toBe(otherUserId);
    await expect(
      crmRepository.listLeads({ limit: 10, storeId, tenantId }),
    ).resolves.toEqual([]);
    await expect(
      listMessages(repository, seeded.conversationCycle.id),
    ).resolves.toEqual(messagesBefore);
    expect(sendText).not.toHaveBeenCalled();
  });

  it("preserves manager global access", async () => {
    const repository = createMemoryCrmConversationRepository();
    const seeded = await seedCycle(repository, otherUserId);
    const sendText = vi.fn(async () => providerResult("provider-manager"));
    const app = createTestApp({
      crmConnectionRepository: connections(),
      crmMessagingGateway: { sendText },
      crmConversationRepository: repository,
      permissions: defaultWhatsappPermissions,
    });

    const response = await start(app);

    expect(response.status).toBe(201);
    expect(
      (await findCycle(repository, seeded.conversationCycle.id))
        ?.assignedUserId,
    ).toBe(otherUserId);
    expect(sendText).toHaveBeenCalledOnce();
  });
});
