import type { PermissionKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmWhatsappRepository } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  createTestApp,
  expectApiError,
} from "./crm.whatsapp.controller.testSupport.js";

const actorUserId = "02020202-0202-4202-8202-020202020202";
const otherUserId = "03030303-0303-4303-8303-030303030303";
const connectionId = "24000000-0000-4000-8000-000000000101";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

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
    await expect(response.json()).resolves.toMatchObject({
      filters: {
        all: 3,
        fresh: 1,
        mine: 1,
        others: 1,
        unassigned: 0,
      },
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
        jsonPost({ assignedUserId: actorUserId }),
      ),
      "crm.whatsapp.assign",
    );
    await expectForbidden(
      app.request(`/api/v1/crm/whatsapp/sessions/${inbound.session.id}/close`, {
        method: "POST",
      }),
      "crm.whatsapp.close",
    );
    await expectForbidden(
      app.request(
        `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/intervention`,
        jsonPost({ enabled: true }),
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

async function expectForbidden(
  responsePromise: Promise<Response> | Response,
  permission: PermissionKey,
) {
  const response = await responsePromise;
  expect(response.status).toBe(403);
  await expectApiError(response, {
    code: "AUTHORIZATION_DENIED",
    message: `Missing permission: ${permission}`,
  });
}

function jsonPost(body: Record<string, unknown>) {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  };
}
