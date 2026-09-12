import { describe, expect, it } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import {
  connectionId,
  createZapiConnection,
  jsonPost,
  storeId,
  tenantId,
} from "./crm.conversationCycleActions.testSupport.js";

describe("CRM conversation cycle lifecycle scope and resurfacing", () => {
  it("rejects archive and pin on a soft-deleted cycle while delete replay stays idempotent", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await conversationRepository.ingestMessage({
      customerDisplayName: "Eva",
      customerPhone: "5511666666666",
      channel: "WHATSAPP",
      connectionId,
      content: "Vou sumir",
      direction: "INBOUND",
      externalId: "inbound-deleted-scope-1",
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
      crmConversationRepository: conversationRepository,
    });
    const cyclePath = `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}`;

    const deleted = await app.request(
      `${cyclePath}/actions/delete`,
      jsonPost({ commandId: "10000000-0000-4000-8000-000000000020" }),
    );
    expect(deleted.status).toBe(200);

    for (const [action, commandId] of [
      ["archive", "10000000-0000-4000-8000-000000000021"],
      ["pin", "10000000-0000-4000-8000-000000000022"],
    ] as const) {
      const response = await app.request(
        `${cyclePath}/actions/${action}`,
        jsonPost({ commandId }),
      );
      expect(response.status).toBe(404);
    }

    const replay = await app.request(
      `${cyclePath}/actions/delete`,
      jsonPost({ commandId: "10000000-0000-4000-8000-000000000020" }),
    );
    expect(replay.status).toBe(200);
    await expect(replay.json()).resolves.toMatchObject({
      result: "already_applied",
    });
  });

  it("resurfaces archived cycles and restores deleted cycles on new inbound messages", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const baseMessage = {
      customerDisplayName: "Fabio",
      customerPhone: "5511777777777",
      channel: "WHATSAPP",
      connectionId,
      direction: "INBOUND",
      metadata: {},
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    } as const;
    const first = await conversationRepository.ingestMessage({
      ...baseMessage,
      content: "Oi",
      externalId: "inbound-resurface-1",
      providerTimestamp: new Date("2026-07-02T18:00:00.000Z"),
    });
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmConversationRepository: conversationRepository,
    });
    const cyclePath = `/api/v1/crm/conversation-cycles/${first.conversationCycle.id}`;

    const archived = await app.request(
      `${cyclePath}/actions/archive`,
      jsonPost({ commandId: "10000000-0000-4000-8000-000000000023" }),
    );
    expect(archived.status).toBe(200);

    const resurfaced = await conversationRepository.ingestMessage({
      ...baseMessage,
      content: "Voltei",
      externalId: "inbound-resurface-2",
      providerTimestamp: new Date("2026-07-02T18:05:00.000Z"),
    });
    expect(resurfaced.conversationCycle.id).toBe(first.conversationCycle.id);
    expect(resurfaced.conversationCycle.archivedAt).toBeNull();
    const afterArchiveList = await app.request(
      "/api/v1/crm/conversation-cycles",
    );
    await expect(afterArchiveList.json()).resolves.toHaveLength(1);

    const deleted = await app.request(
      `${cyclePath}/actions/delete`,
      jsonPost({ commandId: "10000000-0000-4000-8000-000000000024" }),
    );
    expect(deleted.status).toBe(200);
    const afterDeleteList = await app.request(
      "/api/v1/crm/conversation-cycles",
    );
    await expect(afterDeleteList.json()).resolves.toHaveLength(0);

    const restored = await conversationRepository.ingestMessage({
      ...baseMessage,
      content: "Ainda estou aqui",
      externalId: "inbound-resurface-3",
      providerTimestamp: new Date("2026-07-02T18:10:00.000Z"),
    });
    expect(restored.conversationCycle.id).toBe(first.conversationCycle.id);
    expect(restored.conversationCycle.deletedAt).toBeNull();
    const afterRestoreList = await app.request(
      "/api/v1/crm/conversation-cycles",
    );
    await expect(afterRestoreList.json()).resolves.toHaveLength(1);
  });

  it("counts archived cycles through the counts endpoint archived param", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await conversationRepository.ingestMessage({
      customerDisplayName: "Gabi",
      customerPhone: "5511888888888",
      channel: "WHATSAPP",
      connectionId,
      content: "Conta?",
      direction: "INBOUND",
      externalId: "inbound-counts-archived-1",
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
      crmConversationRepository: conversationRepository,
    });

    const archived = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/actions/archive`,
      jsonPost({ commandId: "10000000-0000-4000-8000-000000000025" }),
    );
    expect(archived.status).toBe(200);

    const defaultCounts = await app.request(
      "/api/v1/crm/conversation-cycles/counts",
    );
    await expect(defaultCounts.json()).resolves.toMatchObject({ total: 0 });

    const archivedCounts = await app.request(
      "/api/v1/crm/conversation-cycles/counts?archived=true",
    );
    expect(archivedCounts.status).toBe(200);
    await expect(archivedCounts.json()).resolves.toMatchObject({ total: 1 });
  });

  it("breaks list ordering ties by id ascending", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const sharedTimestamp = new Date("2026-07-02T18:00:00.000Z");
    const ingest = (phone: string, externalId: string) =>
      conversationRepository.ingestMessage({
        customerPhone: phone,
        channel: "WHATSAPP",
        connectionId,
        content: "Empate",
        direction: "INBOUND",
        externalId,
        metadata: {},
        providerTimestamp: sharedTimestamp,
        senderOrigin: "customer",
        senderType: "CUSTOMER",
        status: "DELIVERED",
        storeId,
        tenantId,
        type: "TEXT",
      });
    const first = await ingest("5511100000001", "inbound-tie-1");
    const second = await ingest("5511100000002", "inbound-tie-2");
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmConversationRepository: conversationRepository,
    });

    const list = await app.request("/api/v1/crm/conversation-cycles");
    const ids = ((await list.json()) as { id: string }[]).map(
      (cycle) => cycle.id,
    );
    const expected = [
      first.conversationCycle.id,
      second.conversationCycle.id,
    ].sort((left, right) => (left < right ? -1 : 1));
    expect(ids).toEqual(expected);
  });
});
