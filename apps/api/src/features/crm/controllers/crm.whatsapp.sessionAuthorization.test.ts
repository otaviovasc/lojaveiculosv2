import type { PermissionKey } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.whatsapp.connectionFixtures.js";
import {
  createTestApp,
  defaultWhatsappPermissions,
} from "./crm.whatsapp.controller.testSupport.js";
import {
  actorUserId,
  connectionId,
  ingestText,
  jsonPost,
  otherUserId,
  storeId,
  tenantId,
} from "./crm.whatsapp.queue.testSupport.js";

describe("CRM WhatsApp session queue authorization", () => {
  it("hides inaccessible sessions but atomically claims an unassigned send", async () => {
    const fixture = await createFixture([
      "crm.whatsapp.close",
      "crm.whatsapp.read",
      "crm.whatsapp.send",
      "crm.whatsapp.tags.assign",
      "crm.whatsapp.toggle_intervention",
    ]);

    const unknown = await fixture.app.request(
      "/api/v1/crm/whatsapp/messages/session-does-not-exist",
    );
    const blocked = await Promise.all([
      blockedRequest(
        "foreign messages",
        fixture.app.request(
          `/api/v1/crm/whatsapp/messages/${fixture.other.session.id}`,
        ),
      ),
      blockedRequest(
        "unassigned messages",
        fixture.app.request(
          `/api/v1/crm/whatsapp/messages/${fixture.unassigned.session.id}`,
        ),
      ),
      blockedRequest(
        "foreign send",
        fixture.app.request(
          "/api/v1/crm/whatsapp/send/text",
          jsonPost({ sessionId: fixture.other.session.id, text: "blocked" }),
        ),
      ),
      blockedRequest(
        "foreign read",
        fixture.app.request(
          `/api/v1/crm/whatsapp/sessions/${fixture.other.session.id}/read`,
          jsonPost({ commandId: "41000000-0000-4000-8000-000000000001" }),
        ),
      ),
      blockedRequest(
        "foreign intervention",
        fixture.app.request(
          `/api/v1/crm/whatsapp/sessions/${fixture.other.session.id}/intervention`,
          jsonPost({
            commandId: "41000000-0000-4000-8000-000000000002",
            enabled: true,
          }),
        ),
      ),
      blockedRequest(
        "unassigned close",
        fixture.app.request(
          `/api/v1/crm/whatsapp/sessions/${fixture.unassigned.session.id}/close`,
          jsonPost({ commandId: "41000000-0000-4000-8000-000000000003" }),
        ),
      ),
      blockedRequest(
        "foreign tag",
        fixture.app.request(
          `/api/v1/crm/whatsapp/sessions/${fixture.other.session.id}/tags`,
          jsonPost({ name: "Blocked" }),
        ),
      ),
      blockedRequest(
        "foreign reaction",
        fixture.app.request(
          `/api/v1/crm/whatsapp/messages/${fixture.other.message.id}/reaction`,
          jsonPost({ reaction: "👍" }),
        ),
      ),
    ]);

    expect(await errorContract(unknown)).toEqual({
      code: "CRM_WHATSAPP_NOT_FOUND",
      status: 404,
    });
    for (const [name, response] of blocked) {
      expect(await errorContract(response), name).toEqual({
        code: "CRM_WHATSAPP_NOT_FOUND",
        status: 404,
      });
    }
    expect(fixture.sendText).not.toHaveBeenCalled();
    expect(fixture.sendReaction).not.toHaveBeenCalled();

    const claimedSend = await fixture.app.request(
      "/api/v1/crm/whatsapp/send/text",
      jsonPost({
        sessionId: fixture.unassigned.session.id,
        text: "claimed",
      }),
    );
    expect(claimedSend.status).toBe(201);
    const [claimedSession] = await fixture.repository.listSessions({
      limit: 1,
      offset: 0,
      sessionId: fixture.unassigned.session.id,
      storeId,
      tenantId,
    });
    expect(claimedSession?.assignedUserId).toBe(actorUserId);

    const ownMessages = await fixture.app.request(
      `/api/v1/crm/whatsapp/messages/${fixture.mine.session.id}`,
    );
    const ownSend = await fixture.app.request(
      "/api/v1/crm/whatsapp/send/text",
      jsonPost({ sessionId: fixture.mine.session.id, text: "allowed" }),
    );
    expect(ownMessages.status).toBe(200);
    expect(ownSend.status).toBe(201);
    expect(fixture.sendText).toHaveBeenCalledTimes(2);
  });

  it("keeps foreign and unassigned session access for assign managers", async () => {
    const fixture = await createFixture(defaultWhatsappPermissions);

    for (const sessionId of [
      fixture.other.session.id,
      fixture.unassigned.session.id,
    ]) {
      const messages = await fixture.app.request(
        `/api/v1/crm/whatsapp/messages/${sessionId}`,
      );
      const sent = await fixture.app.request(
        "/api/v1/crm/whatsapp/send/text",
        jsonPost({ sessionId, text: `manager-${sessionId}` }),
      );
      expect(messages.status).toBe(200);
      expect(sent.status).toBe(201);
    }
    expect(fixture.sendText).toHaveBeenCalledTimes(2);
  });
});

async function createFixture(permissions: readonly PermissionKey[]) {
  const repository = createMemoryCrmWhatsappRepository();
  const mine = await ingestText(repository, {
    buyerName: "Mine",
    buyerPhone: "5511999999901",
    content: "mine",
    externalId: "authorization-mine",
    providerTimestamp: new Date("2026-08-17T12:00:00.000Z"),
  });
  const other = await ingestText(repository, {
    buyerName: "Other",
    buyerPhone: "5511999999902",
    content: "other",
    externalId: "authorization-other",
    providerTimestamp: new Date("2026-08-17T12:01:00.000Z"),
  });
  const unassigned = await ingestText(repository, {
    buyerName: "Unassigned",
    buyerPhone: "5511999999903",
    content: "unassigned",
    externalId: "authorization-unassigned",
    providerTimestamp: new Date("2026-08-17T12:02:00.000Z"),
  });
  await repository.updateSession({
    assignedUserId: actorUserId as never,
    sessionId: mine.session.id,
    storeId,
    tenantId,
  });
  await repository.updateSession({
    assignedUserId: otherUserId as never,
    sessionId: other.session.id,
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
      crmWhatsappGateway: { sendReaction, sendText },
      crmWhatsappRepository: repository,
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
