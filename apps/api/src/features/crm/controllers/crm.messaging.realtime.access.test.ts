import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createCrmRealtimeBroker } from "../../../infrastructure/crm/crmRealtimeBroker.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import { registerCrmMessagingRealtimeRoutes } from "./crm.messaging.realtimeRoutes.js";
import { resolveCrmQueueVisibility } from "../../../domains/crm/messaging/crmQueueVisibility.js";

const realtimeServices = {
  resolveCrmQueueVisibility: async (
    context: Parameters<typeof resolveCrmQueueVisibility>[0],
  ) => resolveCrmQueueVisibility(context),
};

describe("CRM realtime access boundaries", () => {
  it("returns 400 when the ticket request body is not an object", async () => {
    const response = await createTestApp({
      crmRealtimeBroker: createCrmRealtimeBroker(),
    }).request("/api/v1/crm/events/ticket", {
      body: "null",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(400);
  });

  it("rejects a ticket issued for another tenant and store", async () => {
    const broker = createCrmRealtimeBroker();
    const issued = await broker.issueTicket({
      connectionId: null,
      queueVisibility: { kind: "global" },
      sinceEventId: null,
      storeId: "store_a" as StoreId,
      tenantId: "tenant_a" as TenantId,
    });
    const feature = new Hono();
    registerCrmMessagingRealtimeRoutes(feature, {
      createContext: async () =>
        Object.assign(
          createServiceContext({
            actor: { id: "user_b", kind: "user" },
            permissions: ["crm.conversations.read"],
            request: { requestId: "req_b" },
            storeId: "store_b" as StoreId,
            tenantId: "tenant_b" as TenantId,
          }),
          { entitlements: ["crm"] },
        ),
      realtimeBroker: broker,
      services: realtimeServices,
    });
    const app = new Hono().route("/api/v1/crm", feature);

    const response = await app.request("/api/v1/crm/events", {
      headers: { "X-CRM-SSE-Ticket": issued.ticket },
    });

    expect(response.status).toBe(403);
  });
});
