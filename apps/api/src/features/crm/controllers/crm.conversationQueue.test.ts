import {
  crmConversationCycleListResponseSchema,
  crmMessageListResponseSchema,
  type PermissionKey,
} from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";
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
} from "./crm.conversationQueue.testSupport.js";

describe("CRM queue", () => {
  it("returns exact cycle counts for operator filters", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    await ingestText(conversationRepository, {
      customerDisplayName: "Ana",
      customerPhone: "5511999999901",
      content: "Lead novo",
      externalId: "queue-count-fresh",
      providerTimestamp: new Date("2026-07-03T12:00:00.000Z"),
    });
    const mine = await ingestText(conversationRepository, {
      customerDisplayName: "Bia",
      customerPhone: "5511999999902",
      content: "Meu atendimento",
      externalId: "queue-count-mine",
      providerTimestamp: new Date("2026-07-03T12:01:00.000Z"),
    });
    const other = await ingestText(conversationRepository, {
      customerDisplayName: "Caio",
      customerPhone: "5511999999903",
      content: "Outro vendedor",
      externalId: "queue-count-other",
      providerTimestamp: new Date("2026-07-03T12:02:00.000Z"),
    });
    await conversationRepository.updateConversationCycle({
      assignedUserId: actorUserId as never,
      lastReadAt: new Date("2030-01-01T00:00:00.000Z"),
      cycleId: mine.conversationCycle.id,
      storeId,
      tenantId,
    });
    await conversationRepository.updateConversationCycle({
      assignedUserId: otherUserId as never,
      cycleId: other.conversationCycle.id,
      storeId,
      tenantId,
    });
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmConversationRepository: conversationRepository,
    });

    const response = await app.request(
      `/api/v1/crm/conversation-cycles/counts?connectionId=${connectionId}`,
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

  it("keeps cycle previews on the newest provider timestamp", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    await ingestText(conversationRepository, {
      customerDisplayName: "Dora",
      customerPhone: "5511999999904",
      content: "Mensagem nova",
      externalId: "queue-preview-new",
      providerTimestamp: new Date("2026-07-03T12:05:00.000Z"),
    });
    await ingestText(conversationRepository, {
      customerDisplayName: "Dora",
      customerPhone: "5511999999904",
      content: "Mensagem atrasada",
      externalId: "queue-preview-old",
      providerTimestamp: new Date("2026-07-03T12:00:00.000Z"),
    });
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmConversationRepository: conversationRepository,
    });

    const response = await app.request(
      `/api/v1/crm/conversation-cycles?connectionId=${connectionId}`,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject([
      {
        lastMessageContent: "Mensagem nova",
      },
    ]);
  });

  it("returns conversation cycles through the public HTTP contract", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await ingestText(conversationRepository, {
      customerDisplayName: "Dora",
      customerPhone: "5511999999904",
      content: "Mensagem nova",
      externalId: "queue-public-contract",
      providerTimestamp: new Date("2026-07-03T12:05:00.000Z"),
    });
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmConversationRepository: conversationRepository,
    });

    const response = await app.request(
      `/api/v1/crm/conversation-cycles?connectionId=${connectionId}`,
    );

    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(() =>
      crmConversationCycleListResponseSchema.parse(body),
    ).not.toThrow();
    expect(body).toMatchObject([
      { channel: "whatsapp", connection: { id: connectionId } },
    ]);

    const messagesResponse = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/messages`,
    );
    const messages: unknown = await messagesResponse.json();
    expect(() => crmMessageListResponseSchema.parse(messages)).not.toThrow();
    expect(messages).toMatchObject([{ channel: "whatsapp" }]);
  });

  it("enforces read-only WhatsApp permissions for store users", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await ingestText(conversationRepository, {
      customerDisplayName: "Eva",
      customerPhone: "5511999999905",
      content: "Pode me chamar?",
      externalId: "queue-permission-inbound",
      providerTimestamp: new Date("2026-07-03T12:10:00.000Z"),
    });
    await conversationRepository.updateConversationCycle({
      assignedUserId: actorUserId as never,
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
        "crm.conversations.read",
        "crm.conversations.read",
      ] satisfies PermissionKey[],
    });

    const countsResponse = await app.request(
      "/api/v1/crm/conversation-cycles/counts",
    );
    const messagesResponse = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/messages`,
    );
    expect(countsResponse.status).toBe(200);
    expect(messagesResponse.status).toBe(200);

    await expectForbidden(
      app.request(
        `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/messages`,
        jsonPost({ content: "Ola" }),
      ),
      "crm.messages.send",
    );
    await expectForbidden(
      app.request(
        `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/actions/assign`,
        jsonPost({
          assignedUserId: actorUserId,
          commandId: "30000000-0000-4000-8000-000000000001",
        }),
      ),
      "crm.conversations.assign",
    );
    await expectForbidden(
      app.request(
        `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/actions/close`,
        jsonPost({ commandId: "30000000-0000-4000-8000-000000000002" }),
      ),
      "crm.conversations.manage",
    );
    await expectForbidden(
      app.request(
        `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/attendance`,
        jsonPost({
          commandId: "30000000-0000-4000-8000-000000000003",
          enabled: true,
        }),
      ),
      "crm.conversations.manage",
    );
  });

  it("requires list permission for queue counts", async () => {
    const app = createTestApp({
      crmConversationRepository: createMemoryCrmConversationRepository(),
      permissions: [] satisfies PermissionKey[],
    });

    await expectForbidden(
      app.request("/api/v1/crm/conversation-cycles/counts"),
      "crm.conversations.read",
    );
  });
});
