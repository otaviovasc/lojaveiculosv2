import type { PermissionKey } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import { createTestApp } from "./crm.controller.testSupport.js";

const permissions = [
  "lead.create",
  "lead.read",
  "lead.update",
  "crm.pipeline.manage",
  "crm.pipeline.move",
  "crm.pipeline.read",
] satisfies PermissionKey[];

describe("CRM lead page", () => {
  it("paginates each stage by cursor and searches beyond the first page", async () => {
    const app = createTestApp({ permissions });
    const { pipelineId, stageId } = await createPipeline(app);

    for (let index = 0; index < 25; index += 1) {
      const buyerName = index === 0 ? "Needle Customer" : `Customer ${index}`;
      const created = await app.request("/api/v1/crm/leads", {
        body: JSON.stringify({ buyerName, source: "manual" }),
        method: "POST",
      });
      expect(created.status).toBe(201);
      const lead = (await created.json()) as { id: string };
      const moved = await app.request(
        `/api/v1/crm/leads/${lead.id}/pipeline-stage`,
        {
          body: JSON.stringify({ pipelineStageId: stageId }),
          method: "PATCH",
        },
      );
      expect(moved.status).toBe(200);
    }

    const first = await getLeadPage(app, {
      limit: "20",
      pipelineId,
      pipelineStageId: stageId,
    });
    expect(first.leads).toHaveLength(20);
    expect(first.total).toBe(25);
    expect(typeof first.nextCursor).toBe("string");

    const second = await getLeadPage(app, {
      cursor: first.nextCursor!,
      limit: "20",
      pipelineId,
      pipelineStageId: stageId,
    });
    expect(second.leads).toHaveLength(5);
    expect(second.nextCursor).toBeNull();
    expect(
      new Set([...first.leads, ...second.leads].map((lead) => lead.id)).size,
    ).toBe(25);

    const searched = await getLeadPage(app, {
      limit: "20",
      pipelineId,
      pipelineStageId: stageId,
      search: "needle",
    });
    expect(searched.total).toBe(1);
    expect(searched.leads).toEqual([
      expect.objectContaining({ buyerName: "Needle Customer" }),
    ]);

    const board = await getLeadBoard(app, {
      pipelineId,
      search: "needle",
      stageLimit: "20",
    });
    expect(board.stages).toEqual([
      expect.objectContaining({
        leads: [expect.objectContaining({ buyerName: "Needle Customer" })],
        pipelineStageId: stageId,
        total: 1,
      }),
    ]);
  });
});

async function createPipeline(app: ReturnType<typeof createTestApp>) {
  const response = await app.request("/api/v1/crm/pipelines", {
    body: JSON.stringify({
      name: "Sales",
      stages: [
        {
          color: "#3b82f6",
          leadStatus: "new",
          name: "New",
          status: "open",
        },
      ],
    }),
    method: "POST",
  });
  expect(response.status).toBe(201);
  const pipeline = (await response.json()) as {
    id: string;
    stages: Array<{ id: string }>;
  };
  return { pipelineId: pipeline.id, stageId: pipeline.stages[0]!.id };
}

async function getLeadPage(
  app: ReturnType<typeof createTestApp>,
  query: Record<string, string>,
) {
  const response = await app.request(
    `/api/v1/crm/leads?${new URLSearchParams(query)}`,
  );
  expect(response.status).toBe(200);
  return (await response.json()) as {
    leads: Array<{ buyerName: string | null; id: string }>;
    nextCursor: string | null;
    total: number;
  };
}

async function getLeadBoard(
  app: ReturnType<typeof createTestApp>,
  query: Record<string, string>,
) {
  const response = await app.request(
    `/api/v1/crm/leads/board?${new URLSearchParams(query)}`,
  );
  expect(response.status).toBe(200);
  return (await response.json()) as {
    stages: Array<{
      leads: Array<{ buyerName: string | null; id: string }>;
      nextCursor: string | null;
      pipelineStageId: string;
      total: number;
    }>;
  };
}
