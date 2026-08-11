import { describe, expect, it } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";
import {
  actorUserId,
  connectionId,
  createZapiConnection,
  jsonPost,
  storeId,
  tenantId,
} from "./crm.whatsapp.sessionActions.testSupport.js";

describe("CRM WhatsApp session actions", () => {
  it("marks sessions read and unread", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const inbound = await whatsappRepository.ingestMessage({
      buyerName: "Bia",
      buyerPhone: "5511888888888",
      channel: "WHATSAPP",
      connectionId,
      content: "Ainda esta disponivel?",
      direction: "INBOUND",
      externalId: "inbound-read-1",
      metadata: {},
      providerTimestamp: new Date("2026-07-02T18:00:00.000Z"),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappRepository: whatsappRepository,
    });

    const readResponse = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/read`,
      jsonPost({ expectedRevision: inbound.session.revision }),
    );
    expect(readResponse.status).toBe(200);
    const read = (await readResponse.json()) as { revision: number };
    expect(read).toMatchObject({
      unreadCount: 0,
    });

    const unreadOnlyResponse = await app.request(
      "/api/v1/crm/whatsapp/sessions?unreadOnly=true",
    );
    expect(unreadOnlyResponse.status).toBe(200);
    await expect(unreadOnlyResponse.json()).resolves.toHaveLength(0);

    const unreadResponse = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/unread`,
      jsonPost({ expectedRevision: read.revision }),
    );
    expect(unreadResponse.status).toBe(200);
    await expect(unreadResponse.json()).resolves.toMatchObject({
      unreadCount: 1,
    });
  });

  it("rejects stale assignment and read revisions", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const inbound = await whatsappRepository.ingestMessage({
      buyerPhone: "5511888888888",
      channel: "WHATSAPP",
      connectionId,
      content: "Revision",
      direction: "INBOUND",
      externalId: "inbound-revision-1",
      metadata: {},
      providerTimestamp: new Date("2026-07-02T18:00:00.000Z"),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappRepository: whatsappRepository,
    });

    const assigned = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/assign`,
      jsonPost({
        assignedUserId: actorUserId,
        expectedRevision: inbound.session.revision,
      }),
    );
    expect(assigned.status).toBe(200);

    const staleAssign = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/assign`,
      jsonPost({ assignedUserId: null, expectedRevision: 1 }),
    );
    expect(staleAssign.status).toBe(409);

    const staleRead = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/read`,
      jsonPost({ expectedRevision: 1 }),
    );
    expect(staleRead.status).toBe(409);

    const staleIntervention = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/intervention`,
      jsonPost({ enabled: true, expectedRevision: 1 }),
    );
    expect(staleIntervention.status).toBe(409);

    const staleClose = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/close`,
      jsonPost({ expectedRevision: 1 }),
    );
    expect(staleClose.status).toBe(409);
  });
});
