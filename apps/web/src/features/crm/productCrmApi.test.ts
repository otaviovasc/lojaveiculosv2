import { describe, expect, it } from "vitest";
import { createProductCrmApi } from "./productCrmApi";

describe("createProductCrmApi", () => {
  it("serializes server-side lead filters", async () => {
    const calls: Array<{ init: RequestInit | undefined; input: string }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ init, input: String(input) });
      return new Response(JSON.stringify({ leads: [] }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    };
    const api = createProductCrmApi({
      baseUrl: "/api/v1",
      fetch: fakeFetch,
    });

    await api.listLeads({
      listingId: "11111111-1111-4111-8111-111111111111",
      limit: 100,
      search: "Ana",
      source: "olx",
      status: "contacted",
    });

    expect(calls[0]).toMatchObject({
      init: { method: "GET" },
      input:
        "/api/v1/crm/leads?listingId=11111111-1111-4111-8111-111111111111&limit=100&search=Ana&source=olx&status=contacted",
    });
  });

  it("posts V2 task activity metadata to lead activities endpoint", async () => {
    const calls: Array<{ init: RequestInit | undefined; input: string }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ init, input: String(input) });
      return new Response(JSON.stringify({ id: "activity-1" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    };
    const api = createProductCrmApi({
      baseUrl: "/api/v1",
      fetch: fakeFetch,
    });

    await api.createActivity("lead-1", {
      activityType: "task",
      content: "Tarefa: ligar",
      direction: "internal",
      metadata: { dueAt: "2027-01-01T09:00", title: "Ligar" },
      occurredAt: "2026-06-22T12:00:00.000Z",
      priority: 1,
    });

    expect(calls[0]).toMatchObject({
      input: "/api/v1/crm/leads/lead-1/activities",
      init: { method: "POST" },
    });
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      activityType: "task",
      content: "Tarefa: ligar",
      direction: "internal",
      metadata: { dueAt: "2027-01-01T09:00", title: "Ligar" },
      occurredAt: "2026-06-22T12:00:00.000Z",
      priority: 1,
    });
  });
});
