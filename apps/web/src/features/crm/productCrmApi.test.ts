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
      offset: 200,
      search: "Ana",
      source: "olx",
      status: "contacted",
    });

    expect(calls[0]).toMatchObject({
      init: { method: "GET" },
      input:
        "/api/v1/crm/leads?listingId=11111111-1111-4111-8111-111111111111&limit=100&offset=200&search=Ana&source=olx&status=contacted",
    });
  });

  it("serializes stage cursor pagination and keeps page metadata", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof fetch = async (input) => {
      calls.push(String(input));
      return new Response(
        JSON.stringify({ leads: [], nextCursor: "next-page", total: 42 }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      );
    };
    const api = createProductCrmApi({ baseUrl: "/api/v1", fetch: fakeFetch });

    const page = await api.listLeadPage({
      cursor: "current-page",
      limit: 20,
      pipelineId: "11111111-1111-4111-8111-111111111111",
      pipelineStageId: "22222222-2222-4222-8222-222222222222",
      search: "hidden customer",
    });

    expect(calls[0]).toBe(
      "/api/v1/crm/leads?cursor=current-page&limit=20&pipelineId=11111111-1111-4111-8111-111111111111&pipelineStageId=22222222-2222-4222-8222-222222222222&search=hidden+customer",
    );
    expect(page).toEqual({
      leads: [],
      nextCursor: "next-page",
      total: 42,
    });
  });

  it("loads all lead-board stages through one endpoint", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof fetch = async (input) => {
      calls.push(String(input));
      return new Response(JSON.stringify({ stages: [] }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    };
    const api = createProductCrmApi({ baseUrl: "/api/v1", fetch: fakeFetch });

    await api.listLeadBoard({
      pipelineId: "11111111-1111-4111-8111-111111111111",
      search: "Ana",
      stageLimit: 20,
    });

    expect(calls).toEqual([
      "/api/v1/crm/leads/board?pipelineId=11111111-1111-4111-8111-111111111111&search=Ana&stageLimit=20",
    ]);
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

  it("posts a lead financial product with an idempotency key", async () => {
    const calls: Array<{ init: RequestInit | undefined; input: string }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ init, input: String(input) });
      return new Response(JSON.stringify({ activity: {}, entries: [] }), {
        headers: { "Content-Type": "application/json" },
        status: 201,
      });
    };
    const api = createProductCrmApi({ baseUrl: "/api/v1", fetch: fakeFetch });

    await api.createFinancialProduct("lead-1", {
      creditLetterAmountCents: 10_000_000,
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
      sellerUserId: "22222222-2222-4222-8222-222222222222",
      type: "consortium",
    });

    expect(calls[0]).toMatchObject({
      input: "/api/v1/crm/leads/lead-1/financial-products",
      init: { method: "POST" },
    });
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      creditLetterAmountCents: 10_000_000,
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
      sellerUserId: "22222222-2222-4222-8222-222222222222",
      type: "consortium",
    });
  });

  it("uses V2 pipeline routes for pipeline config and lead moves", async () => {
    const calls: Array<{ init: RequestInit | undefined; input: string }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ init, input: String(input) });
      const body = String(input).endsWith("/pipelines")
        ? { pipelines: [] }
        : { id: "lead-1" };
      return new Response(JSON.stringify(body), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    };
    const api = createProductCrmApi({
      baseUrl: "/api/v1",
      fetch: fakeFetch,
    });

    await api.listPipelines();
    await api.moveLeadPipelineStage("lead-1", {
      pipelineStageId: "22222222-2222-4222-8222-222222222222",
    });

    expect(calls[0]).toMatchObject({
      input: "/api/v1/crm/pipelines",
      init: { method: "GET" },
    });
    expect(calls[1]).toMatchObject({
      input: "/api/v1/crm/leads/lead-1/pipeline-stage",
      init: { method: "PATCH" },
    });
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      pipelineStageId: "22222222-2222-4222-8222-222222222222",
    });
  });
});
