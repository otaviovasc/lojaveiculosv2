import { describe, expect, it } from "vitest";
import { defaultWhatsappPermissions } from "./crm.controller.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createZapiConnection } from "./crm.whatsapp.webhooks.testSupport.js";

const memberUserId = "user_member_1";
const membersBase = `/api/v1/crm/channel-connections/24000000-0000-4000-8000-000000000101/members`;

function createMembersTestApp(
  options: Parameters<typeof createTestApp>[0] = {},
) {
  const connectionRepository = createMemoryCrmConnectionRepository([
    createZapiConnection(),
  ]);
  return createTestApp({
    crmConnectionRepository: connectionRepository,
    ...options,
  });
}

describe("CRM channel connection members", () => {
  it("grants, lists and revokes a connection member", async () => {
    const app = createMembersTestApp();

    const grant = await app.request(`${membersBase}/${memberUserId}`, {
      method: "PUT",
    });
    expect(grant.status).toBe(204);

    const list = await app.request(membersBase);
    expect(list.status).toBe(200);
    const members = (await list.json()) as {
      grantedBy: string | null;
      userId: string;
    }[];
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({
      grantedBy: "02020202-0202-4202-8202-020202020202",
      userId: memberUserId,
    });

    const revoke = await app.request(`${membersBase}/${memberUserId}`, {
      method: "DELETE",
    });
    expect(revoke.status).toBe(200);
    await expect(revoke.json()).resolves.toMatchObject({ revoked: true });

    const after = (await (await app.request(membersBase)).json()) as unknown[];
    expect(after).toHaveLength(0);
  });

  it("surfaces memberUserIds on the connection overview", async () => {
    const app = createMembersTestApp();
    await app.request(`${membersBase}/${memberUserId}`, { method: "PUT" });

    const overview = await app.request("/api/v1/crm/channel-connections");

    expect(overview.status).toBe(200);
    const body = (await overview.json()) as {
      connections: { id: string; memberUserIds?: string[] }[];
    };
    expect(body.connections[0]?.memberUserIds).toEqual([memberUserId]);
  });

  it("denies member management without the setup permission", async () => {
    const app = createMembersTestApp({
      permissions: defaultWhatsappPermissions.filter(
        (permission) => permission !== "crm.messaging.connection.setup",
      ),
    });

    const grant = await app.request(`${membersBase}/${memberUserId}`, {
      method: "PUT",
    });
    expect(grant.status).toBe(403);

    const list = await app.request(membersBase);
    expect(list.status).toBe(403);

    const revoke = await app.request(`${membersBase}/${memberUserId}`, {
      method: "DELETE",
    });
    expect(revoke.status).toBe(403);
  });

  it("returns 404 for an unknown connection", async () => {
    const app = createMembersTestApp();

    const response = await app.request(
      `/api/v1/crm/channel-connections/24000000-0000-4000-8000-000000000999/members`,
    );

    expect(response.status).toBe(404);
  });
});
