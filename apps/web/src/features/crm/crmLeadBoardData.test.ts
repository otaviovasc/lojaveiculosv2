import { describe, expect, it, vi } from "vitest";
import {
  createProductCrmApi,
  createProductCrmLeadBoardQuery,
  createProductCrmLeadQuery,
} from "./productCrmApi";
import {
  CRM_STAGE_PAGE_SIZE,
  createCrmLeadFilters,
  loadCrmLeadBoard,
  loadCrmLeadStagePage,
} from "./crmLeadBoardData";
import type { Pipeline } from "./crmPipelineStorage";

describe("loadCrmLeadBoard", () => {
  it("requests the whole board once with 20 matching leads per stage", async () => {
    const calls: string[] = [];
    const api = createProductCrmApi({
      baseUrl: "/api/v1",
      fetch: vi.fn(async (input) => {
        calls.push(String(input));
        return new Response(JSON.stringify({ stages: [] }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }),
    });

    const pages = await loadCrmLeadBoard(api, pipeline, {
      search: "Ana",
      source: "all",
      status: "all",
    });

    expect(Object.keys(pages)).toEqual(
      pipeline.stages.map((stage) => stage.id),
    );
    expect(calls).toHaveLength(1);
    const request = new URL(calls[0]!, "https://example.test");
    expect(request.pathname).toBe("/api/v1/crm/leads/board");
    expect(request.searchParams.get("stageLimit")).toBe(
      String(CRM_STAGE_PAGE_SIZE),
    );
    expect(request.searchParams.get("pipelineId")).toBe(pipeline.id);
    expect(request.searchParams.get("search")).toBe("Ana");
  });

  it("propagates sources as CSV, assignee, and listingId in board query", async () => {
    const calls: string[] = [];
    const api = createProductCrmApi({
      baseUrl: "/api/v1",
      fetch: vi.fn(async (input) => {
        calls.push(String(input));
        return new Response(JSON.stringify({ stages: [] }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }),
    });

    await loadCrmLeadBoard(api, pipeline, {
      assignee: "me",
      listingId: "vehicle-123",
      search: "",
      source: "all",
      sources: ["manual", "whatsapp", "instagram"],
      status: "all",
    });

    expect(calls).toHaveLength(1);
    const request = new URL(calls[0]!, "https://example.test");
    expect(request.searchParams.get("sources")).toBe(
      "manual,whatsapp,instagram",
    );
    expect(request.searchParams.get("assignee")).toBe("me");
    expect(request.searchParams.get("listingId")).toBe("vehicle-123");
  });

  it("carries listingId, assignee, sources, and cursor across stage page requests", async () => {
    const calls: string[] = [];
    const api = createProductCrmApi({
      baseUrl: "/api/v1",
      fetch: vi.fn(async (input) => {
        calls.push(String(input));
        return new Response(
          JSON.stringify({ leads: [], nextCursor: null, total: 0 }),
          {
            headers: { "Content-Type": "application/json" },
            status: 200,
          },
        );
      }),
    });

    await loadCrmLeadStagePage(
      api,
      pipeline.id,
      pipeline.stages[0]!.id,
      {
        assignee: "assigned",
        listingId: "vehicle-456",
        search: "",
        source: "all",
        sources: ["olx", "public_site"],
        status: "all",
      },
      "cursor-xyz",
    );

    expect(calls).toHaveLength(1);
    const request = new URL(calls[0]!, "https://example.test");
    expect(request.pathname).toBe("/api/v1/crm/leads");
    expect(request.searchParams.get("cursor")).toBe("cursor-xyz");
    expect(request.searchParams.get("sources")).toBe("olx,public_site");
    expect(request.searchParams.get("assignee")).toBe("assigned");
    expect(request.searchParams.get("listingId")).toBe("vehicle-456");
    expect(request.searchParams.get("pipelineId")).toBe(pipeline.id);
    expect(request.searchParams.get("pipelineStageId")).toBe(
      pipeline.stages[0]!.id,
    );
  });
});

describe("query serializers", () => {
  it("serializes sources as a single CSV parameter in lead query", () => {
    const query = createProductCrmLeadQuery({
      assignee: "user-uuid",
      listingId: "car-uuid",
      sources: ["manual", "whatsapp"],
    });

    expect(query.get("sources")).toBe("manual,whatsapp");
    expect(query.get("assignee")).toBe("user-uuid");
    expect(query.get("listingId")).toBe("car-uuid");
  });

  it("serializes sources as a single CSV parameter in board query", () => {
    const query = createProductCrmLeadBoardQuery({
      assignee: "unassigned",
      listingId: "car-uuid",
      pipelineId: "pipe-1",
      sources: ["instagram", "crm"],
    });

    expect(query.get("sources")).toBe("instagram,crm");
    expect(query.get("assignee")).toBe("unassigned");
    expect(query.get("listingId")).toBe("car-uuid");
  });

  it("createCrmLeadFilters maps sources, assignee, and listingId properly", () => {
    const filters = createCrmLeadFilters({
      assignee: "me",
      listingId: "car-1",
      search: " test ",
      source: "all",
      sources: ["whatsapp"],
      status: "new",
    });

    expect(filters).toEqual(
      expect.objectContaining({
        assignee: "me",
        listingId: "car-1",
        search: "test",
        sources: ["whatsapp"],
        status: "new",
      }),
    );
  });
});

const pipeline: Pipeline = {
  description: "",
  id: "11111111-1111-4111-8111-111111111111",
  isDefault: true,
  name: "Sales",
  rotationActive: false,
  stages: [
    {
      color: "var(--color-accent)",
      id: "22222222-2222-4222-8222-222222222222",
      isSystem: false,
      leadStatus: "new",
      name: "New",
      slaDays: 1,
      status: "open",
    },
    {
      color: "var(--color-success)",
      id: "33333333-3333-4333-8333-333333333333",
      isSystem: false,
      leadStatus: "won",
      name: "Won",
      slaDays: null,
      status: "won",
    },
  ],
};
