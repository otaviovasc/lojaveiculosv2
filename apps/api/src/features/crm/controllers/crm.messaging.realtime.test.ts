import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { createCrmRealtimeBroker } from "../../../infrastructure/crm/crmRealtimeBroker.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { HttpContextAuthenticationError } from "../../../infrastructure/http/createHttpServiceContext.js";
import { registerCrmMessagingRealtimeRoutes } from "./crm.messaging.realtimeRoutes.js";
import { resolveCrmQueueVisibility } from "../../../domains/crm/messaging/crmQueueVisibility.js";
import {
  createConnectionStatusEvent,
  createZapiConnection,
  readSseUntil,
  realtimeConnectionId as connectionId,
  realtimeStoreId as storeId,
  realtimeTenantId as tenantId,
} from "./crm.messaging.realtime.testSupport.js";

const realtimeServices = {
  resolveCrmQueueVisibility: async (
    context: Parameters<typeof resolveCrmQueueVisibility>[0],
  ) => resolveCrmQueueVisibility(context),
};

describe("CRM realtime", () => {
  it("authenticates before consuming a one-use ticket", async () => {
    const broker = createCrmRealtimeBroker();
    const resolveTicket = vi.spyOn(broker, "resolveTicket");
    const feature = new Hono();
    registerCrmMessagingRealtimeRoutes(feature, {
      createContext: async (context) => {
        if (context.req.header("authorization") !== "Bearer fresh-token") {
          throw new HttpContextAuthenticationError("Authentication required.");
        }
        return Object.assign(
          createServiceContext({
            actor: { id: "user_1", kind: "user" },
            permissions: ["crm.conversations.read"],
            request: { requestId: "req_1" },
            storeId,
            tenantId,
          }),
          { entitlements: ["crm"] },
        );
      },
      realtimeBroker: broker,
      services: realtimeServices,
    });
    const app = new Hono().route("/api/v1/crm", feature);
    const ticketResponse = await app.request("/api/v1/crm/events/ticket", {
      body: "{}",
      headers: {
        Authorization: "Bearer fresh-token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const ticket = (await ticketResponse.json()) as { ticket: string };

    const staleResponse = await app.request("/api/v1/crm/events", {
      headers: {
        Authorization: "Bearer stale-token",
        "X-CRM-SSE-Ticket": ticket.ticket,
      },
    });
    expect(staleResponse.status).toBe(401);
    expect(resolveTicket).not.toHaveBeenCalled();

    const streamResponse = await app.request("/api/v1/crm/events", {
      headers: {
        Authorization: "Bearer fresh-token",
        "X-CRM-SSE-Ticket": ticket.ticket,
      },
    });
    expect(streamResponse.status).toBe(200);
    expect(resolveTicket).toHaveBeenCalledOnce();
    await streamResponse.body?.cancel();
  });

  it.each([
    { label: "missing", ticket: undefined },
    { label: "malformed", ticket: "not-a-ticket" },
  ])(
    "rejects $label ticket headers without broker lookup",
    async ({ ticket }) => {
      const broker = createCrmRealtimeBroker();
      const resolveTicket = vi.spyOn(broker, "resolveTicket");
      const app = createTestApp({ crmRealtimeBroker: broker });

      const response = await app.request("/api/v1/crm/events", {
        ...(ticket ? { headers: { "X-CRM-SSE-Ticket": ticket } } : {}),
      });

      expect(response.status).toBe(401);
      expect(resolveTicket).not.toHaveBeenCalled();
    },
  );

  it.each([
    { connectionId: "not-a-uuid", label: "connection id" },
    { label: "event cursor", lastEventId: "invalid\nlog-entry" },
  ])("rejects an invalid $label before issuing a ticket", async (body) => {
    const broker = createCrmRealtimeBroker();
    const issueTicket = vi.spyOn(broker, "issueTicket");
    const app = createTestApp({ crmRealtimeBroker: broker });

    const response = await app.request("/api/v1/crm/events/ticket", {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(400);
    expect(issueTicket).not.toHaveBeenCalled();
  });

  it("opens a ticketed realtime stream", async () => {
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRealtimeBroker: createCrmRealtimeBroker(),
    });

    const ticketResponse = await app.request("/api/v1/crm/events/ticket", {
      body: JSON.stringify({ connectionId }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(ticketResponse.status).toBe(200);
    expect(ticketResponse.headers.get("cache-control")).toBe("no-store");
    expect(ticketResponse.headers.get("referrer-policy")).toBe("no-referrer");
    const ticket = (await ticketResponse.json()) as { ticket: string };

    const streamResponse = await app.request("/api/v1/crm/events", {
      headers: { "X-CRM-SSE-Ticket": ticket.ticket },
    });
    expect(streamResponse.status).toBe(200);
    expect(streamResponse.headers.get("content-type")).toContain(
      "text/event-stream",
    );
    expect(streamResponse.headers.get("cache-control")).toBe("no-store");
    expect(streamResponse.headers.get("referrer-policy")).toBe("no-referrer");
    const reader = streamResponse.body?.getReader();
    expect(reader).toBeDefined();
    const chunk = await reader!.read();
    await reader!.cancel();
    expect(new TextDecoder().decode(chunk.value)).toContain(
      '"type":"connected"',
    );

    const reusedResponse = await app.request("/api/v1/crm/events", {
      headers: { "X-CRM-SSE-Ticket": ticket.ticket },
    });
    expect(reusedResponse.status).toBe(401);
    expect(reusedResponse.headers.get("cache-control")).toBe("no-store");
    expect(reusedResponse.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("replays from the ticket cursor and ignores GET cursor overrides", async () => {
    const broker = createCrmRealtimeBroker();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRealtimeBroker: broker,
    });
    await broker.publish(createConnectionStatusEvent("first"));
    const [first] = await broker.replay({
      connectionId,
      queueVisibility: { kind: "global" },
      sinceEventId: "0-0",
      storeId,
      tenantId,
    });
    expect(first).toBeDefined();

    await broker.publish(createConnectionStatusEvent("second"));
    await broker.publish(
      createConnectionStatusEvent("other", "other-connection"),
    );
    const [second] = await broker.replay({
      connectionId,
      queueVisibility: { kind: "global" },
      sinceEventId: first!.id,
      storeId,
      tenantId,
    });
    expect(second?.event).toMatchObject({ status: "second" });

    const ticketResponse = await app.request("/api/v1/crm/events/ticket", {
      body: JSON.stringify({
        connectionId,
        lastEventId: first!.id,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const ticket = (await ticketResponse.json()) as { ticket: string };
    const streamResponse = await app.request(
      "/api/v1/crm/events?sinceEventId=0-0",
      {
        headers: {
          "Last-Event-ID": "0-0",
          "X-CRM-SSE-Ticket": ticket.ticket,
        },
      },
    );
    const stream = await readSseUntil(streamResponse, "second");

    expect(stream).toContain(`id: ${second!.id}`);
    expect(stream).toContain("event: connection_status");
    expect(stream).toContain('"status":"second"');
    expect(stream).not.toContain('"status":"first"');
    expect(stream).not.toContain('"status":"other"');
  });
});
