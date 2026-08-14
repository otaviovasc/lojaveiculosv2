import { describe, expect, it } from "vitest";
import type { PermissionKey } from "@lojaveiculosv2/shared";
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
      jsonPost({ commandId: "10000000-0000-4000-8000-000000000001" }),
    );
    expect(readResponse.status).toBe(200);
    const read = (await readResponse.json()) as {
      session: { revision: number };
    };
    expect(read).toMatchObject({
      result: "applied",
      session: { unreadCount: 0 },
    });

    const unreadOnlyResponse = await app.request(
      "/api/v1/crm/whatsapp/sessions?unreadOnly=true",
    );
    expect(unreadOnlyResponse.status).toBe(200);
    await expect(unreadOnlyResponse.json()).resolves.toHaveLength(0);

    const unreadResponse = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/unread`,
      jsonPost({ commandId: "10000000-0000-4000-8000-000000000002" }),
    );
    expect(unreadResponse.status).toBe(200);
    await expect(unreadResponse.json()).resolves.toMatchObject({
      result: "applied",
      session: { unreadCount: 1 },
    });
  });

  it("replays commands idempotently and rejects command reuse", async () => {
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
        commandId: "10000000-0000-4000-8000-000000000003",
      }),
    );
    expect(assigned.status).toBe(200);

    const replay = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/assign`,
      jsonPost({
        assignedUserId: actorUserId,
        commandId: "10000000-0000-4000-8000-000000000003",
      }),
    );
    expect(replay.status).toBe(200);
    await expect(replay.json()).resolves.toMatchObject({
      result: "already_applied",
      session: { assignedUserId: actorUserId },
    });

    const conflictingReuse = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/assign`,
      jsonPost({
        assignedUserId: null,
        commandId: "10000000-0000-4000-8000-000000000003",
      }),
    );
    expect(conflictingReuse.status).toBe(409);
  });

  it("returns superseded when a seller loses an ordinary claim race", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const inbound = await whatsappRepository.ingestMessage({
      buyerPhone: "5511777777777",
      channel: "WHATSAPP",
      connectionId,
      content: "Claim race",
      direction: "INBOUND",
      externalId: "inbound-claim-race-1",
      metadata: {},
      providerTimestamp: new Date("2026-07-02T18:00:00.000Z"),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    await whatsappRepository.updateSession({
      assignedUserId: "03030303-0303-4303-8303-030303030303" as never,
      expectedRevision: inbound.session.revision,
      sessionId: inbound.session.id,
      storeId,
      tenantId,
    });
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappRepository: whatsappRepository,
      permissions: [
        "crm.whatsapp.assign",
        "crm.whatsapp.list",
      ] satisfies PermissionKey[],
    });

    const response = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/assign`,
      jsonPost({
        assignedUserId: actorUserId,
        commandId: "10000000-0000-4000-8000-000000000004",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      result: "superseded",
      session: {
        assignedUserId: "03030303-0303-4303-8303-030303030303",
      },
    });
  });
});
