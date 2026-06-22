import { Hono } from "hono";
import type { AuditEvent, AuditSink } from "@lojaveiculosv2/audit";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createCrmFeature } from "./crm.controller.js";
import { createCrmServices } from "./crmServices.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import type { RepassesCrmClient } from "../../../domains/crm/acl/repassesCrmClient.js";

function createTestApp(
  repassesCrm: RepassesCrmClient,
  options: {
    audit?: AuditSink;
    permissions?: PermissionKey[];
  } = {},
) {
  const app = new Hono();
  app.route(
    "/api/v1/crm",
    createCrmFeature({
      contextFactory: async () =>
        createServiceContext({
          actor: { id: "user_1", kind: "user" },
          ...(options.audit ? { audit: options.audit } : {}),
          permissions: options.permissions ?? ["lead.read", "lead.update"],
          request: { requestId: "req_1" },
          storeId: "store_1",
          tenantId: "tenant_1",
        }),
      services: createCrmServices({
        ports: { crmRepository: createMemoryCrmRepository() },
        repassesCrmClient: repassesCrm,
      }),
    }),
  );
  return app;
}

function createRepassesCrmStub(
  overrides: Partial<RepassesCrmClient> = {},
): RepassesCrmClient {
  return {
    assignSession: vi.fn(),
    closeSession: vi.fn(),
    createSession: vi.fn(),
    getAgents: vi.fn(),
    getConnections: vi.fn(),
    getConversation: vi.fn(),
    listMessages: vi.fn(),
    listSessions: vi.fn(),
    markSessionAsRead: vi.fn(),
    markSessionAsUnread: vi.fn(),
    sendText: vi.fn(),
    toggleIntervention: vi.fn(),
    ...overrides,
  };
}

function createAuditSpy() {
  const record = vi.fn(async (_event: AuditEvent) => undefined);
  const audit: AuditSink = {
    record: async (event) => {
      await record(event);
    },
  };
  return { audit, record };
}

describe("CRM WhatsApp controller", () => {
  it("proxies session reads through the repasses ACL with Clerk bearer auth", async () => {
    const { audit, record } = createAuditSpy();
    const repassesCrm = createRepassesCrmStub({
      listSessions: vi.fn(async () => [{ id: 42, uuid: "session_42" }]),
    });
    const app = createTestApp(repassesCrm, { audit });

    const response = await app.request(
      "/api/v1/crm/whatsapp/sessions?limit=20&search=ana",
      { headers: { Authorization: "Bearer clerk-token" } },
    );

    await expect(response.json()).resolves.toEqual([
      { id: 42, uuid: "session_42" },
    ]);
    expect(repassesCrm.listSessions).toHaveBeenCalledWith(
      { clerkSessionToken: "clerk-token" },
      expect.objectContaining({ limit: 20, offset: 0, search: "ana" }),
    );
    const auditEvent = record.mock.calls[0]?.[0];
    expect(auditEvent).toMatchObject({
      action: "crm.whatsapp.sessions.list",
      category: "data_access",
    });
    expect(auditEvent?.metadata?.permission).toBe("lead.read");
  });

  it("requires Clerk bearer auth for WhatsApp ACL routes", async () => {
    const app = createTestApp(createRepassesCrmStub());

    const response = await app.request("/api/v1/crm/whatsapp/sessions");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: "CRM WhatsApp requires a Clerk bearer token.",
    });
  });

  it("requires lead read permission before proxying WhatsApp reads", async () => {
    const repassesCrm = createRepassesCrmStub({ listSessions: vi.fn() });
    const app = createTestApp(repassesCrm, { permissions: ["crm.access"] });

    const response = await app.request("/api/v1/crm/whatsapp/sessions", {
      headers: { Authorization: "Bearer clerk-token" },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      message: "Missing permission: lead.read",
    });
    expect(repassesCrm.listSessions).not.toHaveBeenCalled();
  });

  it("requires lead update permission and audits WhatsApp text sends", async () => {
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
      permissions: ["lead.read", "lead.update"],
    });

    const response = await app.request("/api/v1/crm/whatsapp/send/text", {
      body: JSON.stringify({ sessionId: 42, text: "Ola" }),
      headers: {
        Authorization: "Bearer clerk-token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(repassesCrm.sendText).toHaveBeenCalledWith(
      { clerkSessionToken: "clerk-token" },
      { sessionId: 42, text: "Ola" },
    );
    const auditEvent = record.mock.calls[0]?.[0];
    expect(auditEvent).toMatchObject({
      action: "crm.whatsapp.message.send_text",
      category: "data_change",
      entityId: "42",
    });
    expect(auditEvent?.metadata?.permission).toBe("lead.update");
  });

  it("requires lead update permission before proxying WhatsApp mutations", async () => {
    const repassesCrm = createRepassesCrmStub({ sendText: vi.fn() });
    const app = createTestApp(repassesCrm, { permissions: ["lead.read"] });

    const response = await app.request("/api/v1/crm/whatsapp/send/text", {
      body: JSON.stringify({ sessionId: 42, text: "Ola" }),
      headers: {
        Authorization: "Bearer clerk-token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      message: "Missing permission: lead.update",
    });
    expect(repassesCrm.sendText).not.toHaveBeenCalled();
  });
});
