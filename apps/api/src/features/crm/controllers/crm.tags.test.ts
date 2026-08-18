import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("CRM tags", () => {
  it("persists cycle tags as CRM tag assignments", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await seedCycle(conversationRepository, "tag");
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmConversationRepository: conversationRepository,
    });

    const added = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/tags`,
      {
        body: JSON.stringify({ color: "#16a34a", name: "Quente" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(added.status).toBe(200);
    const cycle = (await added.json()) as {
      tags: Array<{ id: string; name: string }>;
    };
    expect(cycle.tags).toMatchObject([{ name: "Quente" }]);

    const removed = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/tags/${cycle.tags[0]!.id}`,
      { method: "DELETE" },
    );

    expect(removed.status).toBe(200);
    await expect(removed.json()).resolves.toMatchObject({ tags: [] });
  });

  it("lists simple tags without CRM column behavior", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await seedCycle(conversationRepository, "column-tag");
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmConversationRepository: conversationRepository,
    });

    await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/tags`,
      {
        body: JSON.stringify({
          color: "#2563eb",
          name: "Em atendimento",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    const moved = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/tags`,
      {
        body: JSON.stringify({
          color: "#16a34a",
          name: "Visita agendada",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(moved.status).toBe(200);
    await expect(moved.json()).resolves.toMatchObject({
      tags: [{ name: "Em atendimento" }, { name: "Visita agendada" }],
    });
    const tags = await app.request("/api/v1/crm/tags");
    expect(tags.status).toBe(200);
    const body = (await tags.json()) as Array<{ name: string }>;
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Em atendimento" }),
        expect.objectContaining({ name: "Visita agendada" }),
      ]),
    );
    expect(JSON.stringify(body)).not.toContain("isColumn");
  });

  it("filters cycles by assigned CRM tags", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmConversationRepository: conversationRepository,
    });
    const tagged = await seedCycle(conversationRepository, "tagged-cycle", {
      customerDisplayName: "Lead Quente",
      customerPhone: "5511888881111",
      content: "Tenho interesse",
    });
    await seedCycle(conversationRepository, "untagged-cycle", {
      customerDisplayName: "Lead Frio",
      customerPhone: "5511888882222",
      content: "Talvez depois",
    });
    const tagResponse = await app.request(
      `/api/v1/crm/conversation-cycles/${tagged.conversationCycle.id}/tags`,
      {
        body: JSON.stringify({ color: "#dc2626", name: "Quente" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    const taggedCycle = (await tagResponse.json()) as {
      tags: Array<{ id: string }>;
    };

    const response = await app.request(
      `/api/v1/crm/conversation-cycles?filter=all&tagIds=${taggedCycle.tags[0]!.id}`,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject([
      { customerDisplayName: "Lead Quente" },
    ]);
  });
});

function seedCycle(
  conversationRepository: ReturnType<
    typeof createMemoryCrmConversationRepository
  >,
  suffix: string,
  overrides: Partial<{
    customerDisplayName: string;
    customerPhone: string;
    content: string;
  }> = {},
) {
  return conversationRepository.ingestMessage({
    customerDisplayName: overrides.customerDisplayName ?? "Ana",
    customerPhone: overrides.customerPhone ?? "5511999999999",
    channel: "WHATSAPP",
    connectionId,
    content: overrides.content ?? "Ola",
    direction: "INBOUND",
    externalId: `inbound-tags-${suffix}`,
    metadata: {},
    providerTimestamp: new Date("2026-07-02T20:00:00.000Z"),
    senderOrigin: "customer",
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
    broker: "direct",
    channel: "whatsapp",
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
