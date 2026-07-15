import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmWhatsappRepository } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

const brunoUserId = "03030303-0303-4303-8303-030303030303";
const carlaUserId = "04040404-0404-4404-8404-040404040404";
const connectionId = "24000000-0000-4000-8000-000000000101";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM WhatsApp queue assignee filter", () => {
  it("scopes the others queue to a selected store assignee", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const bruno = await ingestText(whatsappRepository, {
      buyerName: "Bruno",
      buyerPhone: "5511999999911",
      content: "Atendimento do Bruno",
      externalId: "queue-assignee-bruno",
      providerTimestamp: new Date("2026-07-03T12:00:00.000Z"),
    });
    const carla = await ingestText(whatsappRepository, {
      buyerName: "Carla",
      buyerPhone: "5511999999912",
      content: "Atendimento da Carla",
      externalId: "queue-assignee-carla",
      providerTimestamp: new Date("2026-07-03T12:01:00.000Z"),
    });
    await whatsappRepository.updateSession({
      assignedUserId: brunoUserId as never,
      sessionId: bruno.session.id,
      storeId,
      tenantId,
    });
    await whatsappRepository.updateSession({
      assignedUserId: carlaUserId as never,
      sessionId: carla.session.id,
      storeId,
      tenantId,
    });
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappRepository: whatsappRepository,
    });

    const response = await app.request(
      `/api/v1/crm/whatsapp/sessions?connectionId=${connectionId}&filter=others&assigneeId=${brunoUserId}`,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject([
      { assignedUserId: brunoUserId, buyerName: "Bruno" },
    ]);
  });
});

function ingestText(
  repository: CrmWhatsappRepository,
  input: {
    buyerName: string;
    buyerPhone: string;
    content: string;
    externalId: string;
    providerTimestamp: Date;
  },
) {
  return repository.ingestMessage({
    ...input,
    channel: "WHATSAPP",
    connectionId,
    direction: "INBOUND",
    metadata: {},
    senderType: "CUSTOMER",
    status: "DELIVERED",
    storeId,
    tenantId,
    type: "TEXT",
  });
}

function createZapiConnection(): CrmConnection {
  return {
    credentialsRef: {},
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id: connectionId,
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "sandbox",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}
