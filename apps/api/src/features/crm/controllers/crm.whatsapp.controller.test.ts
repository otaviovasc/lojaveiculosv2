import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAuditSpy,
  createRepassesCrmStub,
  createTestApp,
  expectApiError,
} from "./crm.whatsapp.controller.testSupport.js";

describe("CRM WhatsApp controller", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("proxies session reads through the repasses ACL with Clerk bearer auth", async () => {
    const { audit, record } = createAuditSpy();
    const repassesCrm = createRepassesCrmStub({
      listSessions: vi.fn(async () => [{ id: 42, uuid: "session_42" }]),
    });
    const app = createTestApp(repassesCrm, { audit });

    const response = await app.request(
      "/api/v1/crm/whatsapp/sessions?limit=20&search=ana",
      {
        headers: {
          Authorization: "Bearer clerk-token",
          host: "test-store.lojaveiculos.com.br",
        },
      },
    );

    await expect(response.json()).resolves.toEqual([
      { id: 42, uuid: "session_42" },
    ]);
    expect(repassesCrm.listSessions).toHaveBeenCalledWith(
      expect.objectContaining({
        clerkSessionToken: "clerk-token",
        repassesConnectionId: 10,
        storeSlug: "test-store",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
      expect.objectContaining({
        connectionId: 10,
        limit: 20,
        offset: 0,
        search: "ana",
      }),
    );
    const auditEvent = record.mock.calls[0]?.[0];
    expect(auditEvent).toMatchObject({
      action: "crm.whatsapp.sessions.list",
      category: "data_access",
    });
    expect(auditEvent?.metadata?.permission).toBe("crm.whatsapp.list");
  });

  it("scopes bootstrap to the V2 store and exposes assignment capability", async () => {
    const repassesCrm = createRepassesCrmStub({
      getAgents: vi.fn(async () => ({ agents: [{ id: 1, isActive: true }] })),
      getAuthContext: vi.fn(async () => ({
        canAssignSessions: true,
        connectionId: 10,
      })),
      getConnections: vi.fn(async () => ({
        connections: [
          { id: 9, lojaSlug: "other-store", status: "CONNECTED" },
          { id: 10, lojaSlug: "test-store", status: "CONNECTED" },
        ],
      })),
    });
    const app = createTestApp(repassesCrm);

    const response = await app.request("/api/v1/crm/whatsapp/bootstrap", {
      headers: {
        Authorization: "Bearer clerk-token",
        "x-store-slug": "test-store",
      },
    });

    await expect(response.json()).resolves.toMatchObject({
      connections: [{ id: 10, lojaSlug: "test-store" }],
      scope: { canAssignSessions: true, connectionId: 10 },
    });
    expect(repassesCrm.getAgents).toHaveBeenCalledWith(
      expect.objectContaining({
        repassesConnectionId: 10,
        storeSlug: "test-store",
      }),
    );
  });

  it("hides bootstrap assignment capability when V2 assign permission is denied", async () => {
    const repassesCrm = createRepassesCrmStub({
      getAuthContext: vi.fn(async () => ({
        canAssignSessions: true,
        connectionId: 10,
      })),
    });
    const app = createTestApp(repassesCrm, {
      permissions: ["crm.whatsapp.list", "crm.whatsapp.read"],
    });

    const response = await app.request("/api/v1/crm/whatsapp/bootstrap", {
      headers: {
        Authorization: "Bearer clerk-token",
        "x-store-slug": "test-store",
      },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      scope: { canAssignSessions: false, connectionId: 10 },
    });
  });

  it("requires Clerk bearer auth for WhatsApp ACL routes", async () => {
    const app = createTestApp(createRepassesCrmStub());

    const response = await app.request("/api/v1/crm/whatsapp/sessions");

    expect(response.status).toBe(401);
    await expectApiError(response, {
      code: "REPASSES_CRM_AUTH_ERROR",
      message: "CRM WhatsApp requires a Clerk bearer token.",
    });
  });

  it("uses a local demo token when local auth bypass is enabled", async () => {
    vi.stubEnv("APP_ENV", "local");
    vi.stubEnv("LOCAL_AUTH_BYPASS", "true");
    vi.stubEnv("REPASSES_CRM_LOCAL_DEMO", "true");
    const repassesCrm = createRepassesCrmStub({
      listSessions: vi.fn(async () => []),
    });
    const app = createTestApp(repassesCrm);

    const response = await app.request("/api/v1/crm/whatsapp/sessions", {
      headers: { "x-store-slug": "test-store" },
    });

    expect(response.status).toBe(200);
    expect(repassesCrm.listSessions).toHaveBeenCalledWith(
      expect.objectContaining({
        clerkSessionToken: "local-demo-repasses-token",
        repassesConnectionId: 10,
        storeSlug: "test-store",
      }),
      expect.any(Object),
    );
  });

  it("requires WhatsApp list permission before proxying session lists", async () => {
    const repassesCrm = createRepassesCrmStub({ listSessions: vi.fn() });
    const app = createTestApp(repassesCrm, { permissions: ["crm.access"] });

    const response = await app.request("/api/v1/crm/whatsapp/sessions", {
      headers: { Authorization: "Bearer clerk-token" },
    });

    expect(response.status).toBe(403);
    await expectApiError(response, {
      code: "AUTHORIZATION_DENIED",
      message: "Missing permission: crm.whatsapp.list",
    });
    expect(repassesCrm.listSessions).not.toHaveBeenCalled();
  });

  it("requires WhatsApp send permission and audits WhatsApp text sends", async () => {
    const { audit, record } = createAuditSpy();
    const repassesCrm = createRepassesCrmStub({
      sendText: vi.fn(async () => ({
        content: "Ola",
        createdAt: "2026-06-22T19:00:00.000Z",
        direction: "OUTBOUND",
        id: 10,
        senderType: "HUMAN",
        status: "SENT",
        type: "TEXT",
      })),
    });
    const app = createTestApp(repassesCrm, {
      audit,
      permissions: ["crm.whatsapp.list", "crm.whatsapp.send"],
    });

    const response = await app.request("/api/v1/crm/whatsapp/send/text", {
      body: JSON.stringify({ sessionId: 42, text: "Ola" }),
      headers: {
        Authorization: "Bearer clerk-token",
        "Content-Type": "application/json",
        "x-store-slug": "test-store",
      },
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(repassesCrm.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        clerkSessionToken: "clerk-token",
        repassesConnectionId: 10,
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
      { sessionId: 42, text: "Ola" },
    );
    expect(record).toHaveBeenCalledTimes(2);
    expect(record.mock.calls[0]?.[0]).toMatchObject({
      action: "crm.whatsapp.message.send_text",
      category: "data_change",
      entityId: "42",
      outcome: "attempted",
    });
    expect(record.mock.calls[1]?.[0]?.outcome).toBe("succeeded");
    expect(record.mock.calls[0]?.[0]?.metadata?.permission).toBe(
      "crm.whatsapp.send",
    );
  });
});
