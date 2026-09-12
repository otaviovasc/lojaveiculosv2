import { describe, expect, it } from "vitest";
import type { PermissionKey } from "@lojaveiculosv2/shared";
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

describe("CRM conversation cycle lifecycle actions", () => {
  it("archives and unarchives cycles and filters the default list", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await conversationRepository.ingestMessage({
      customerDisplayName: "Caio",
      customerPhone: "5511555555555",
      channel: "WHATSAPP",
      connectionId,
      content: "Tem desconto?",
      direction: "INBOUND",
      externalId: "inbound-archive-1",
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

    const archived = await app.request(
      `${cyclePath}/actions/archive`,
      jsonPost({ commandId: "10000000-0000-4000-8000-000000000010" }),
    );
    expect(archived.status).toBe(200);
    await expect(archived.json()).resolves.toMatchObject({
      result: "applied",
      cycle: { isArchived: true },
    });

    const defaultList = await app.request("/api/v1/crm/conversation-cycles");
    await expect(defaultList.json()).resolves.toHaveLength(0);

    const archivedList = await app.request(
      "/api/v1/crm/conversation-cycles?archived=true",
    );
    const archivedCycles = (await archivedList.json()) as {
      id: string;
      isArchived: boolean;
    }[];
    expect(archivedCycles).toHaveLength(1);
    expect(archivedCycles[0]).toMatchObject({
      id: inbound.conversationCycle.id,
      isArchived: true,
    });

    const unarchived = await app.request(
      `${cyclePath}/actions/archive`,
      jsonPost({ commandId: "10000000-0000-4000-8000-000000000011" }),
    );
    expect(unarchived.status).toBe(200);
    await expect(unarchived.json()).resolves.toMatchObject({
      result: "applied",
      cycle: { isArchived: false },
    });
    const restoredList = await app.request("/api/v1/crm/conversation-cycles");
    await expect(restoredList.json()).resolves.toHaveLength(1);
  });

  it("pins and unpins cycles and sorts pinned first", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const oldest = await conversationRepository.ingestMessage({
      customerDisplayName: "Antiga",
      customerPhone: "5511444444444",
      channel: "WHATSAPP",
      connectionId,
      content: "Oi",
      direction: "INBOUND",
      externalId: "inbound-pin-1",
      metadata: {},
      providerTimestamp: new Date("2026-07-02T10:00:00.000Z"),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    await conversationRepository.ingestMessage({
      customerDisplayName: "Recente",
      customerPhone: "5511333333333",
      channel: "WHATSAPP",
      connectionId,
      content: "Ola",
      direction: "INBOUND",
      externalId: "inbound-pin-2",
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

    const pinned = await app.request(
      `/api/v1/crm/conversation-cycles/${oldest.conversationCycle.id}/actions/pin`,
      jsonPost({ commandId: "10000000-0000-4000-8000-000000000012" }),
    );
    expect(pinned.status).toBe(200);
    await expect(pinned.json()).resolves.toMatchObject({
      result: "applied",
      cycle: { isPinned: true },
    });

    const list = await app.request("/api/v1/crm/conversation-cycles");
    const cycles = (await list.json()) as {
      id: string;
      isPinned: boolean;
    }[];
    expect(cycles[0]).toMatchObject({
      id: oldest.conversationCycle.id,
      isPinned: true,
    });
    expect(cycles[1]?.isPinned).toBe(false);

    const unpinned = await app.request(
      `/api/v1/crm/conversation-cycles/${oldest.conversationCycle.id}/actions/pin`,
      jsonPost({ commandId: "10000000-0000-4000-8000-000000000013" }),
    );
    expect(unpinned.status).toBe(200);
    await expect(unpinned.json()).resolves.toMatchObject({
      result: "applied",
      cycle: { isPinned: false },
    });
  });

  it("soft deletes cycles without deleting messages", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await conversationRepository.ingestMessage({
      customerDisplayName: "Dora",
      customerPhone: "5511222222222",
      channel: "WHATSAPP",
      connectionId,
      content: "Quero excluir",
      direction: "INBOUND",
      externalId: "inbound-delete-1",
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
      jsonPost({ commandId: "10000000-0000-4000-8000-000000000014" }),
    );
    expect(deleted.status).toBe(200);
    await expect(deleted.json()).resolves.toMatchObject({
      result: "applied",
    });

    const list = await app.request("/api/v1/crm/conversation-cycles");
    await expect(list.json()).resolves.toHaveLength(0);

    const replay = await app.request(
      `${cyclePath}/actions/delete`,
      jsonPost({ commandId: "10000000-0000-4000-8000-000000000014" }),
    );
    expect(replay.status).toBe(200);
    await expect(replay.json()).resolves.toMatchObject({
      result: "already_applied",
    });

    const messages = await conversationRepository.listMessages({
      cycleId: inbound.conversationCycle.id,
      limit: 10,
      offset: 0,
      storeId,
      tenantId,
    });
    expect(messages).toHaveLength(1);
  });

  it("rejects lifecycle actions without the manage permission", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await conversationRepository.ingestMessage({
      customerPhone: "5511111111111",
      channel: "WHATSAPP",
      connectionId,
      content: "Sem permissao",
      direction: "INBOUND",
      externalId: "inbound-lifecycle-denied-1",
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
      permissions: ["crm.conversations.read"] satisfies PermissionKey[],
    });

    for (const action of ["archive", "pin", "delete"]) {
      const response = await app.request(
        `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/actions/${action}`,
        jsonPost({ commandId: "10000000-0000-4000-8000-000000000015" }),
      );
      expect(response.status).toBe(403);
    }
  });
});
