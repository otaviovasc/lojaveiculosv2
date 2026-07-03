import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("CRM WhatsApp tags", () => {
  it("persists session tags as CRM tag assignments", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const inbound = await seedSession(whatsappRepository, "tag");
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappRepository: whatsappRepository,
    });

    const added = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/tags`,
      {
        body: JSON.stringify({ color: "#16a34a", name: "Quente" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(added.status).toBe(200);
    const session = (await added.json()) as {
      sessionTags: Array<{ id: string; name: string }>;
    };
    expect(session.sessionTags).toMatchObject([{ name: "Quente" }]);

    const removed = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/tags/${session.sessionTags[0]!.id}`,
      { method: "DELETE" },
    );

    expect(removed.status).toBe(200);
    await expect(removed.json()).resolves.toMatchObject({ sessionTags: [] });
  });

  it("lists tags and enforces one CRM column tag per session", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const inbound = await seedSession(whatsappRepository, "column-tag");
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappRepository: whatsappRepository,
    });

    await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/tags`,
      {
        body: JSON.stringify({
          color: "#2563eb",
          isColumn: true,
          name: "Em atendimento",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    const moved = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/tags`,
      {
        body: JSON.stringify({
          color: "#16a34a",
          isColumn: true,
          name: "Visita agendada",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(moved.status).toBe(200);
    await expect(moved.json()).resolves.toMatchObject({
      sessionTags: [{ isColumn: true, name: "Visita agendada" }],
    });
    const tags = await app.request("/api/v1/crm/whatsapp/tags");
    expect(tags.status).toBe(200);
    await expect(tags.json()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ isColumn: true, name: "Em atendimento" }),
        expect.objectContaining({ isColumn: true, name: "Visita agendada" }),
      ]),
    );
  });

  it("filters sessions by assigned CRM WhatsApp tags", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappRepository: whatsappRepository,
    });
    const tagged = await seedSession(whatsappRepository, "tagged-session", {
      buyerName: "Lead Quente",
      buyerPhone: "5511888881111",
      content: "Tenho interesse",
    });
    await seedSession(whatsappRepository, "untagged-session", {
      buyerName: "Lead Frio",
      buyerPhone: "5511888882222",
      content: "Talvez depois",
    });
    const tagResponse = await app.request(
      `/api/v1/crm/whatsapp/sessions/${tagged.session.id}/tags`,
      {
        body: JSON.stringify({ color: "#dc2626", name: "Quente" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    const taggedSession = (await tagResponse.json()) as {
      sessionTags: Array<{ id: string }>;
    };

    const response = await app.request(
      `/api/v1/crm/whatsapp/sessions?filter=all&tagIds=${taggedSession.sessionTags[0]!.id}`,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject([
      { buyerName: "Lead Quente" },
    ]);
  });
});

function seedSession(
  whatsappRepository: ReturnType<typeof createMemoryCrmWhatsappRepository>,
  suffix: string,
  overrides: Partial<{
    buyerName: string;
    buyerPhone: string;
    content: string;
  }> = {},
) {
  return whatsappRepository.ingestMessage({
    buyerName: overrides.buyerName ?? "Ana",
    buyerPhone: overrides.buyerPhone ?? "5511999999999",
    channel: "WHATSAPP",
    connectionId,
    content: overrides.content ?? "Ola",
    direction: "INBOUND",
    externalId: `inbound-tags-${suffix}`,
    metadata: {},
    providerTimestamp: new Date("2026-07-02T20:00:00.000Z"),
    senderType: "CUSTOMER",
    status: "DELIVERED",
    storeId,
    tenantId,
    type: "TEXT",
  });
}

function createZapiConnection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
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
    ...overrides,
  };
}
