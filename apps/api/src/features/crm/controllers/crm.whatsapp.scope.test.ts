import { describe, expect, it, vi } from "vitest";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import {
  createRepassesCrmStub,
  createTestApp,
  defaultWhatsappPermissions,
  expectApiError,
} from "./crm.whatsapp.controller.testSupport.js";

describe("CRM WhatsApp connection scope", () => {
  it("rejects stale client connection ids before proxying WhatsApp reads", async () => {
    const repassesCrm = createRepassesCrmStub({
      listSessions: vi.fn(async () => []),
    });
    const app = createTestApp(repassesCrm);

    const response = await app.request(
      "/api/v1/crm/whatsapp/sessions?connectionId=99",
      {
        headers: {
          Authorization: "Bearer clerk-token",
          "x-store-slug": "test-store",
        },
      },
    );

    expect(response.status).toBe(403);
    await expectApiError(response, {
      code: "AUTHORIZATION_DENIED",
      message: "CRM WhatsApp connection does not belong to this store.",
    });
    expect(repassesCrm.listSessions).not.toHaveBeenCalled();
  });

  it("rejects a sole Repasses connection that does not match host store scope", async () => {
    const repassesCrm = createRepassesCrmStub({
      getConnections: vi.fn(async () => ({
        connections: [{ id: 10, lojaSlug: "other-store", status: "CONNECTED" }],
      })),
      listSessions: vi.fn(async () => []),
    });
    const app = createTestApp(repassesCrm);

    const response = await app.request("/api/v1/crm/whatsapp/sessions", {
      headers: {
        Authorization: "Bearer clerk-token",
        host: "test-store.lojaveiculos.com.br",
      },
    });

    expect(response.status).toBe(403);
    await expectApiError(response, {
      code: "AUTHORIZATION_DENIED",
      message: "CRM WhatsApp connection is not scoped to this store.",
    });
    expect(repassesCrm.listSessions).not.toHaveBeenCalled();
  });

  it("requires CRM entitlement before proxying WhatsApp operations", async () => {
    const repassesCrm = createRepassesCrmStub({
      getConnections: vi.fn(),
      listSessions: vi.fn(),
    });
    const app = createTestApp(repassesCrm, { entitlements: [] });

    const response = await app.request("/api/v1/crm/whatsapp/sessions", {
      headers: { Authorization: "Bearer clerk-token" },
    });

    expect(response.status).toBe(403);
    await expectApiError(response, {
      code: "AUTHORIZATION_DENIED",
      message: "Missing entitlement: crm",
    });
    expect(repassesCrm.getConnections).not.toHaveBeenCalled();
    expect(repassesCrm.listSessions).not.toHaveBeenCalled();
  });

  it.each([
    {
      body: undefined,
      method: "GET",
      path: "/api/v1/crm/whatsapp/bootstrap",
      permission: "crm.whatsapp.list",
      proxy: "getConnections",
    },
    {
      body: undefined,
      method: "GET",
      path: "/api/v1/crm/whatsapp/sessions",
      permission: "crm.whatsapp.list",
      proxy: "listSessions",
    },
    {
      body: undefined,
      method: "GET",
      path: "/api/v1/crm/whatsapp/messages/42",
      permission: "crm.whatsapp.read",
      proxy: "listMessages",
    },
    {
      body: undefined,
      method: "POST",
      path: "/api/v1/crm/whatsapp/sessions/42/read",
      permission: "crm.whatsapp.read",
      proxy: "markSessionAsRead",
    },
    {
      body: {},
      method: "POST",
      path: "/api/v1/crm/whatsapp/sessions/42/unread",
      permission: "crm.whatsapp.read",
      proxy: "markSessionAsUnread",
    },
    {
      body: { phone: "11999990000" },
      method: "POST",
      path: "/api/v1/crm/whatsapp/sessions",
      permission: "crm.whatsapp.send",
      proxy: "createSession",
    },
    {
      body: { agentId: 7 },
      method: "POST",
      path: "/api/v1/crm/whatsapp/sessions/42/assign",
      permission: "crm.whatsapp.assign",
      proxy: "assignSession",
    },
    {
      body: { mode: "default" },
      method: "POST",
      path: "/api/v1/crm/whatsapp/sessions/42/close",
      permission: "crm.whatsapp.close",
      proxy: "closeSession",
    },
    {
      body: undefined,
      method: "POST",
      path: "/api/v1/crm/whatsapp/sessions/42/toggle-intervention",
      permission: "crm.whatsapp.toggle_intervention",
      proxy: "toggleIntervention",
    },
  ] as const)(
    "requires $permission before proxying $path",
    async ({ body, method, path, permission, proxy }) => {
      const repassesCrm = createRepassesCrmStub({ [proxy]: vi.fn() });
      const app = createTestApp(repassesCrm, {
        permissions: withoutPermission(permission),
      });

      const response = await app.request(path, {
        ...(body ? { body: JSON.stringify(body) } : {}),
        headers: {
          Authorization: "Bearer clerk-token",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        method,
      });

      expect(response.status).toBe(403);
      await expectApiError(response, {
        code: "AUTHORIZATION_DENIED",
        message: `Missing permission: ${permission}`,
      });
      expect(repassesCrm[proxy]).not.toHaveBeenCalled();
    },
  );
});

function withoutPermission(permission: PermissionKey): PermissionKey[] {
  return defaultWhatsappPermissions.filter((item) => item !== permission);
}
