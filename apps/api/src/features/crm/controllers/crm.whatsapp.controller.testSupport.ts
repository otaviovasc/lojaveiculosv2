import type { AuditEvent, AuditSink } from "@lojaveiculosv2/audit";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import { Hono } from "hono";
import { vi } from "vitest";
import type { RepassesCrmClient } from "../../../domains/crm/acl/repassesCrmClient.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createCrmFeature } from "./crm.controller.js";
import { createCrmServices } from "./crmServices.js";

export function createTestApp(
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

export function createRepassesCrmStub(
  overrides: Partial<RepassesCrmClient> = {},
): RepassesCrmClient {
  return {
    assignSession: vi.fn(),
    closeSession: vi.fn(),
    createSession: vi.fn(),
    getAgents: vi.fn(),
    getAuthContext: vi.fn(async () => ({
      canAssignSessions: false,
      connectionId: null,
    })),
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

export function createAuditSpy() {
  const record = vi.fn(async (_event: AuditEvent) => undefined);
  const audit: AuditSink = {
    record: async (event) => {
      await record(event);
    },
  };
  return { audit, record };
}
