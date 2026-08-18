import type { PermissionKey } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import {
  createTestApp,
  defaultWhatsappPermissions,
} from "./crm.controller.testSupport.js";
import {
  actorUserId,
  connectionId,
  ingestText,
  jsonPost,
  otherUserId,
  storeId,
  tenantId,
} from "./crm.conversationQueue.testSupport.js";

describe("CRM cycle queue authorization", () => {
  it("hides inaccessible cycles but atomically claims an unassigned send", async () => {
    const fixture = await createFixture([
      "crm.conversations.manage",
      "crm.conversations.read",
      "crm.messages.send",
      "crm.tags.assign",
      "crm.conversations.manage",
    ]);

    const unknown = await fixture.app.request(
      "/api/v1/crm/conversation-cycles/cycle-does-not-exist/messages",
    );
    const blocked = await Promise.all([
      blockedRequest(
        "foreign messages",
        fixture.app.request(
          `/api/v1/crm/conversation-cycles/${fixture.other.conversationCycle.id}/messages`,
        ),
      ),
      blockedRequest(
        "unassigned messages",
        fixture.app.request(
          `/api/v1/crm/conversation-cycles/${fixture.unassigned.conversationCycle.id}/messages`,
        ),
      ),
      blockedRequest(
        "foreign send",
        fixture.app.request(
          `/api/v1/crm/conversation-cycles/${fixture.other.conversationCycle.id}/messages`,
          jsonPost({ content: "blocked" }),
        ),
      ),
      blockedRequest(
        "foreign read",
        fixture.app.request(
          `/api/v1/crm/conversation-cycles/${fixture.other.conversationCycle.id}/actions/read`,
          jsonPost({ commandId: "41000000-0000-4000-8000-000000000001" }),
        ),
      ),
      blockedRequest(
        "foreign intervention",
        fixture.app.request(
          `/api/v1/crm/conversation-cycles/${fixture.other.conversationCycle.id}/attendance`,
          jsonPost({
            commandId: "41000000-0000-4000-8000-000000000002",
            enabled: true,
          }),
        ),
      ),
      blockedRequest(
        "unassigned close",
        fixture.app.request(
          `/api/v1/crm/conversation-cycles/${fixture.unassigned.conversationCycle.id}/actions/close`,
          jsonPost({ commandId: "41000000-0000-4000-8000-000000000003" }),
        ),
      ),
      blockedRequest(
        "foreign tag",
        fixture.app.request(
          `/api/v1/crm/conversation-cycles/${fixture.other.conversationCycle.id}/tags`,
          jsonPost({ name: "Blocked" }),
        ),
      ),
      blockedRequest(
        "foreign reaction",
        fixture.app.request(
          `/api/v1/crm/messages/${fixture.other.message.id}/reaction`,
          jsonPost({ reaction: "👍" }),
        ),
      ),
    ]);

    expect(await errorContract(unknown)).toEqual({
      code: "CRM_MESSAGING_NOT_FOUND",
      status: 404,
    });
    for (const [name, response] of blocked) {
      expect(await errorContract(response), name).toEqual({
        code:
          name === "foreign intervention"
            ? "AUTHORIZATION_DENIED"
            : "CRM_MESSAGING_NOT_FOUND",
        status: name === "foreign intervention" ? 403 : 404,
      });
    }
    expect(fixture.sendText).not.toHaveBeenCalled();
    expect(fixture.sendReaction).not.toHaveBeenCalled();

    const claimedSend = await fixture.app.request(
      `/api/v1/crm/conversation-cycles/${fixture.unassigned.conversationCycle.id}/messages`,
      jsonPost({
        content: "claimed",
      }),
    );
    expect(claimedSend.status).toBe(201);
    const [claimedCycle] = await fixture.repository.listConversationCycles({
      limit: 1,
      offset: 0,
      cycleId: fixture.unassigned.conversationCycle.id,
      storeId,
      tenantId,
    });
    expect(claimedCycle?.assignedUserId).toBe(actorUserId);

    const ownMessages = await fixture.app.request(
      `/api/v1/crm/conversation-cycles/${fixture.mine.conversationCycle.id}/messages`,
    );
    const ownSend = await fixture.app.request(
      `/api/v1/crm/conversation-cycles/${fixture.mine.conversationCycle.id}/messages`,
      jsonPost({ content: "allowed" }),
    );
    expect(ownMessages.status).toBe(200);
    expect(ownSend.status).toBe(201);
    expect(fixture.sendText).toHaveBeenCalledTimes(2);
  });

  it("keeps foreign and unassigned cycle access for assign managers", async () => {
    const fixture = await createFixture(defaultWhatsappPermissions);

    for (const cycleId of [
      fixture.other.conversationCycle.id,
      fixture.unassigned.conversationCycle.id,
    ]) {
      const messages = await fixture.app.request(
        `/api/v1/crm/conversation-cycles/${cycleId}/messages`,
      );
      const sent = await fixture.app.request(
        `/api/v1/crm/conversation-cycles/${cycleId}/messages`,
        jsonPost({ content: `manager-${cycleId}` }),
      );
      expect(messages.status).toBe(200);
      expect(sent.status).toBe(201);
    }
    expect(fixture.sendText).toHaveBeenCalledTimes(2);
  });
});

async function createFixture(permissions: readonly PermissionKey[]) {
  const repository = createMemoryCrmConversationRepository();
  const mine = await ingestText(repository, {
    customerDisplayName: "Mine",
    customerPhone: "5511999999901",
    content: "mine",
    externalId: "authorization-mine",
    providerTimestamp: new Date("2026-08-17T12:00:00.000Z"),
  });
  const other = await ingestText(repository, {
    customerDisplayName: "Other",
    customerPhone: "5511999999902",
    content: "other",
    externalId: "authorization-other",
    providerTimestamp: new Date("2026-08-17T12:01:00.000Z"),
  });
  const unassigned = await ingestText(repository, {
    customerDisplayName: "Unassigned",
    customerPhone: "5511999999903",
    content: "unassigned",
    externalId: "authorization-unassigned",
    providerTimestamp: new Date("2026-08-17T12:02:00.000Z"),
  });
  await repository.updateConversationCycle({
    assignedUserId: actorUserId as never,
    cycleId: mine.conversationCycle.id,
    storeId,
    tenantId,
  });
  await repository.updateConversationCycle({
    assignedUserId: otherUserId as never,
    cycleId: other.conversationCycle.id,
    storeId,
    tenantId,
  });
  const sendText = vi.fn(async () => ({
    externalId: `sent-${sendText.mock.calls.length + 1}`,
    providerTimestamp: new Date("2026-08-17T12:10:00.000Z"),
    raw: {},
  }));
  const sendReaction = vi.fn(async () => ({
    externalId: "reaction-1",
    providerTimestamp: new Date("2026-08-17T12:10:00.000Z"),
    raw: {},
  }));
  return {
    app: createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConfiguredZapiTestConnection({
          id: connectionId,
          storeId,
          tenantId,
        }),
      ]),
      crmMessagingGateway: { sendReaction, sendText },
      crmConversationRepository: repository,
      permissions: [...permissions],
    }),
    mine,
    other,
    repository,
    sendReaction,
    sendText,
    unassigned,
  };
}

async function errorContract(response: Response) {
  const body = (await response.json()) as { code?: string };
  return { code: body.code, status: response.status };
}

async function blockedRequest(
  name: string,
  response: Promise<Response> | Response,
): Promise<readonly [string, Response]> {
  return [name, await response] as const;
}
