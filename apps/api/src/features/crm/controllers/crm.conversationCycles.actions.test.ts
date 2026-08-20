import { describe, expect, it } from "vitest";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import {
  actorUserId,
  connectionId,
  createZapiConnection,
  jsonPost,
  storeId,
  tenantId,
} from "./crm.conversationCycleActions.testSupport.js";

describe("CRM cycle actions", () => {
  it("marks cycles read and unread", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await conversationRepository.ingestMessage({
      customerDisplayName: "Bia",
      customerPhone: "5511888888888",
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
      crmConversationRepository: conversationRepository,
    });

    const readResponse = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/actions/read`,
      jsonPost({ commandId: "10000000-0000-4000-8000-000000000001" }),
    );
    expect(readResponse.status).toBe(200);
    const read = (await readResponse.json()) as {
      cycle: { revision: number };
    };
    expect(read).toMatchObject({
      result: "applied",
      cycle: { unreadCount: 0 },
    });

    const unreadOnlyResponse = await app.request(
      "/api/v1/crm/conversation-cycles?unreadOnly=true",
    );
    expect(unreadOnlyResponse.status).toBe(200);
    await expect(unreadOnlyResponse.json()).resolves.toHaveLength(0);

    const unreadResponse = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/actions/unread`,
      jsonPost({ commandId: "10000000-0000-4000-8000-000000000002" }),
    );
    expect(unreadResponse.status).toBe(200);
    await expect(unreadResponse.json()).resolves.toMatchObject({
      result: "applied",
      cycle: { unreadCount: 1 },
    });
  });

  it("replays commands idempotently and rejects command reuse", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await conversationRepository.ingestMessage({
      customerPhone: "5511888888888",
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
      crmConversationRepository: conversationRepository,
    });

    const assigned = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/actions/assign`,
      jsonPost({
        assignedUserId: actorUserId,
        commandId: "10000000-0000-4000-8000-000000000003",
      }),
    );
    expect(assigned.status).toBe(200);

    const replay = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/actions/assign`,
      jsonPost({
        assignedUserId: actorUserId,
        commandId: "10000000-0000-4000-8000-000000000003",
      }),
    );
    expect(replay.status).toBe(200);
    await expect(replay.json()).resolves.toMatchObject({
      result: "already_applied",
      cycle: { assignedUserId: actorUserId },
    });

    const conflictingReuse = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/actions/assign`,
      jsonPost({
        assignedUserId: null,
        commandId: "10000000-0000-4000-8000-000000000003",
      }),
    );
    expect(conflictingReuse.status).toBe(409);
  });

  it("returns superseded when a seller loses an ordinary claim race", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await conversationRepository.ingestMessage({
      customerPhone: "5511777777777",
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
    await conversationRepository.updateConversationCycle({
      assignedUserId: "03030303-0303-4303-8303-030303030303" as never,
      expectedRevision: inbound.conversationCycle.revision,
      cycleId: inbound.conversationCycle.id,
      storeId,
      tenantId,
    });
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmConversationRepository: conversationRepository,
      permissions: [
        "crm.conversations.assign",
        "crm.conversations.read",
      ] satisfies PermissionKey[],
    });

    const response = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/actions/assign`,
      jsonPost({
        assignedUserId: actorUserId,
        commandId: "10000000-0000-4000-8000-000000000004",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      result: "superseded",
      cycle: {
        assignedUserId: "03030303-0303-4303-8303-030303030303",
      },
    });
  });
});
