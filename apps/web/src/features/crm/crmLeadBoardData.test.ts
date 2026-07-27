import { describe, expect, it, vi } from "vitest";
import { createProductCrmApi } from "./productCrmApi";
import { CRM_STAGE_PAGE_SIZE, loadCrmLeadBoard } from "./crmLeadBoardData";
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
});

const pipeline: Pipeline = {
  description: "",
  id: "11111111-1111-4111-8111-111111111111",
  isDefault: true,
  name: "Sales",
  rotationActive: false,
  routingRules: [],
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
