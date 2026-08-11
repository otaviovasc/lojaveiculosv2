import type { PermissionKey } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";
import {
  actorUserId,
  connectionId,
  createZapiConnection,
  expectForbidden,
  ingestText,
  jsonPost,
  otherUserId,
  storeId,
  tenantId,
} from "./crm.whatsapp.queue.testSupport.js";

describe("CRM WhatsApp queue", () => {
  it("returns exact session counts for operator filters", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    await ingestText(whatsappRepository, {
      buyerName: "Ana",
      buyerPhone: "5511999999901",
      content: "Lead novo",
      externalId: "queue-count-fresh",
      providerTimestamp: new Date("2026-07-03T12:00:00.000Z"),
    });
    const mine = await ingestText(whatsappRepository, {
      buyerName: "Bia",
      buyerPhone: "5511999999902",
      content: "Meu atendimento",
      externalId: "queue-count-mine",
      providerTimestamp: new Date("2026-07-03T12:01:00.000Z"),
    });
    const other = await ingestText(whatsappRepository, {
      buyerName: "Caio",
      buyerPhone: "5511999999903",
      content: "Outro vendedor",
      externalId: "queue-count-other",
      providerTimestamp: new Date("2026-07-03T12:02:00.000Z"),
    });
    await whatsappRepository.updateSession({
      assignedUserId: actorUserId as never,
      lastReadAt: new Date("2030-01-01T00:00:00.000Z"),
      sessionId: mine.session.id,
      storeId,
      tenantId,
    });
    await whatsappRepository.updateSession({
      assignedUserId: otherUserId as never,
      sessionId: other.session.id,
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
      `/api/v1/crm/whatsapp/session-counts?connectionId=${connectionId}`,
    );

    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(body).toMatchObject({
      assignees: [
        { assigneeId: actorUserId, count: 1 },
        { assigneeId: otherUserId, count: 1 },
      ],
      filters: { all: 3, fresh: 1, mine: 1, others: 1, unassigned: 0 },
      statuses: { ACTIVE: 3 },
      total: 3,
      unread: 2,
    });
  });

  it("keeps session previews on the newest provider timestamp", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    await ingestText(whatsappRepository, {
      buyerName: "Dora",
      buyerPhone: "5511999999904",
      content: "Mensagem nova",
      externalId: "queue-preview-new",
      providerTimestamp: new Date("2026-07-03T12:05:00.000Z"),
    });
    await ingestText(whatsappRepository, {
      buyerName: "Dora",
      buyerPhone: "5511999999904",
      content: "Mensagem atrasada",
      externalId: "queue-preview-old",
      providerTimestamp: new Date("2026-07-03T12:00:00.000Z"),
    });
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappRepository: whatsappRepository,
    });

    const response = await app.request(
      `/api/v1/crm/whatsapp/sessions?connectionId=${connectionId}`,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject([
      {
        lastMessageContent: "Mensagem nova",
      },
    ]);
  });

  it("enforces read-only WhatsApp permissions for store users", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const inbound = await ingestText(whatsappRepository, {
      buyerName: "Eva",
      buyerPhone: "5511999999905",
      content: "Pode me chamar?",
      externalId: "queue-permission-inbound",
      providerTimestamp: new Date("2026-07-03T12:10:00.000Z"),
    });
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappRepository: whatsappRepository,
      permissions: [
        "crm.whatsapp.list",
        "crm.whatsapp.read",
      ] satisfies PermissionKey[],
    });

    const countsResponse = await app.request(
      "/api/v1/crm/whatsapp/session-counts",
    );
    const messagesResponse = await app.request(
      `/api/v1/crm/whatsapp/messages/${inbound.session.id}`,
    );
    expect(countsResponse.status).toBe(200);
    expect(messagesResponse.status).toBe(200);

    await expectForbidden(
      app.request(
        "/api/v1/crm/whatsapp/send/text",
        jsonPost({ sessionId: inbound.session.id, text: "Ola" }),
      ),
      "crm.whatsapp.send",
    );
    await expectForbidden(
      app.request(
        `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/assign`,
        jsonPost({
          assignedUserId: actorUserId,
          expectedRevision: inbound.session.revision,
        }),
      ),
      "crm.whatsapp.assign",
    );
    await expectForbidden(
      app.request(
        `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/close`,
        jsonPost({ expectedRevision: inbound.session.revision }),
      ),
      "crm.whatsapp.close",
    );
    await expectForbidden(
      app.request(
        `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/intervention`,
        jsonPost({ enabled: true, expectedRevision: inbound.session.revision }),
      ),
      "crm.whatsapp.toggle_intervention",
    );
  });

  it("requires list permission for queue counts", async () => {
    const app = createTestApp({
      crmWhatsappRepository: createMemoryCrmWhatsappRepository(),
      permissions: ["crm.whatsapp.read"] satisfies PermissionKey[],
    });

    await expectForbidden(
      app.request("/api/v1/crm/whatsapp/session-counts"),
      "crm.whatsapp.list",
    );
  });
});
