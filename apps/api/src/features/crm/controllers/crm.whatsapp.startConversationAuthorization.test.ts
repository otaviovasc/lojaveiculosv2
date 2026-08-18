import type { PermissionKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmWhatsappRepository } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmPipelineRepository } from "../adapters/memory/crmPipelineRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.whatsapp.connectionFixtures.js";
import {
  createTestApp,
  defaultWhatsappPermissions,
} from "./crm.whatsapp.controller.testSupport.js";
import { requestStartConversation } from "./crm.whatsapp.startConversation.testSupport.js";

const actorUserId = "02020202-0202-4202-8202-020202020202";
const connectionId = "24000000-0000-4000-8000-000000000101";
const otherUserId = "03030303-0303-4303-8303-030303030303";
const phone = "5511999999988";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const restrictedPermissions = ["crm.whatsapp.send"] satisfies PermissionKey[];

describe("CRM WhatsApp start conversation authorization", () => {
  it("returns 404 without a provider call for another user's session", async () => {
    const repository = createMemoryCrmWhatsappRepository();
    await seedSession(repository, otherUserId);
    const sendText = vi.fn(async () => providerResult("foreign-provider"));
    const app = createTestApp({
      crmConnectionRepository: connections(),
      crmWhatsappGateway: { sendText },
      crmWhatsappRepository: repository,
      permissions: restrictedPermissions,
    });

    const response = await start(app);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_WHATSAPP_NOT_FOUND",
    });
    expect(sendText).not.toHaveBeenCalled();
  });

  it("claims an existing unassigned session before the provider call", async () => {
    const repository = createMemoryCrmWhatsappRepository();
    const crmRepository = createMemoryCrmRepository();
    const crmPipelineRepository = createMemoryCrmPipelineRepository();
    const seeded = await seedSession(repository, null);
    const events: string[] = [];
    const findSessionByIdentity =
      repository.findSessionByIdentity.bind(repository);
    repository.findSessionByIdentity = vi.fn(async (input) => {
      events.push("resolve");
      return findSessionByIdentity(input);
    });
    const updateSession = repository.updateSession.bind(repository);
    repository.updateSession = vi.fn(
      async (input: Parameters<CrmWhatsappRepository["updateSession"]>[0]) => {
        if (input.assignedUserId === actorUserId) events.push("claim");
        return updateSession(input);
      },
    );
    const ingestMessage = repository.ingestMessage.bind(repository);
    repository.ingestMessage = vi.fn(async (input) => {
      events.push("ingest");
      return ingestMessage(input);
    });
    const sendText = vi.fn(async () => {
      const current = await findSession(repository, seeded.session.id);
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
        crmWhatsappRepository: repository,
      });
      events.push("transaction:commit");
      return result;
    };
    const app = createTestApp({
      crmConnectionRepository: connections(),
      crmPipelineRepository,
      crmRepository,
      crmWhatsappGateway: { sendText },
      crmWhatsappRepository: repository,
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
    const repository = createMemoryCrmWhatsappRepository();
    const crmRepository = createMemoryCrmRepository();
    const seeded = await seedSession(repository, null);
    const messagesBefore = await listMessages(repository, seeded.session.id);
    const updateSession = repository.updateSession.bind(repository);
    let injectConcurrentClaim = true;
    repository.updateSession = vi.fn(
      async (input: Parameters<CrmWhatsappRepository["updateSession"]>[0]) => {
        if (input.assignedUserId === actorUserId && injectConcurrentClaim) {
          injectConcurrentClaim = false;
          await updateSession({
            assignedUserId: otherUserId as never,
            ...(input.expectedRevision !== undefined
              ? { expectedRevision: input.expectedRevision }
              : {}),
            sessionId: input.sessionId,
            storeId: input.storeId,
            tenantId: input.tenantId,
          });
        }
        return updateSession(input);
      },
    );
    const sendText = vi.fn(async () => providerResult("concurrent-provider"));
    const app = createTestApp({
      crmConnectionRepository: connections(),
      crmRepository,
      crmWhatsappGateway: { sendText },
      crmWhatsappRepository: repository,
      permissions: restrictedPermissions,
    });

    const response = await start(app);

    expect(response.status).toBe(404);
    expect(
      (await findSession(repository, seeded.session.id))?.assignedUserId,
    ).toBe(otherUserId);
    await expect(
      crmRepository.listLeads({ limit: 10, storeId, tenantId }),
    ).resolves.toEqual([]);
    await expect(listMessages(repository, seeded.session.id)).resolves.toEqual(
      messagesBefore,
    );
    expect(sendText).not.toHaveBeenCalled();
  });

  it("preserves manager global access", async () => {
    const repository = createMemoryCrmWhatsappRepository();
    const seeded = await seedSession(repository, otherUserId);
    const sendText = vi.fn(async () => providerResult("provider-manager"));
    const app = createTestApp({
      crmConnectionRepository: connections(),
      crmWhatsappGateway: { sendText },
      crmWhatsappRepository: repository,
      permissions: defaultWhatsappPermissions,
    });

    const response = await start(app);

    expect(response.status).toBe(201);
    expect(
      (await findSession(repository, seeded.session.id))?.assignedUserId,
    ).toBe(otherUserId);
    expect(sendText).toHaveBeenCalledOnce();
  });
});

function connections() {
  return createMemoryCrmConnectionRepository([
    createConfiguredZapiTestConnection({ id: connectionId, storeId, tenantId }),
  ]);
}

async function seedSession(
  repository: CrmWhatsappRepository,
  assignedUserId: string | null,
) {
  const seeded = await repository.ingestMessage({
    buyerPhone: phone,
    channel: "WHATSAPP",
    connectionId,
    content: "Inbound",
    direction: "INBOUND",
    externalId: `inbound-${assignedUserId ?? "unassigned"}`,
    metadata: {},
    providerTimestamp: new Date("2026-08-18T12:00:00.000Z"),
    senderOrigin: "customer",
    senderType: "CUSTOMER",
    status: "DELIVERED",
    storeId,
    tenantId,
    type: "TEXT",
  });
  if (assignedUserId) {
    await repository.updateSession({
      assignedUserId: assignedUserId as never,
      sessionId: seeded.session.id,
      storeId,
      tenantId,
    });
  }
  return seeded;
}

function findSession(repository: CrmWhatsappRepository, sessionId: string) {
  return repository
    .listSessions({ limit: 1, offset: 0, sessionId, storeId, tenantId })
    .then(([session]) => session);
}

function listMessages(repository: CrmWhatsappRepository, sessionId: string) {
  return repository.listMessages({
    limit: 10,
    offset: 0,
    sessionId,
    storeId,
    tenantId,
  });
}

function providerResult(externalId: string) {
  return {
    externalId,
    providerTimestamp: new Date("2026-08-18T12:01:00.000Z"),
    raw: {},
  };
}

function start(app: ReturnType<typeof createTestApp>) {
  return requestStartConversation(app, {
    connectionId,
    phone,
    text: "Outbound",
  });
}
