import { describe, expect, it } from "vitest";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import {
  createAuditSpy,
  createTestApp,
  expectApiError,
} from "./crm.whatsapp.controller.testSupport.js";

const permissions = [
  "lead.create",
  "lead.read",
  "lead.update",
  "crm.pipeline.manage",
  "crm.pipeline.move",
  "crm.pipeline.read",
] satisfies PermissionKey[];

describe("CRM pipeline routes", () => {
  it("creates, lists, and updates DB-backed pipeline definitions", async () => {
    const { audit, record } = createAuditSpy();
    const app = createTestApp({ audit, permissions });

    const created = await app.request("/api/v1/crm/pipelines", {
      body: JSON.stringify({
        name: "Vendas",
        stages: [
          {
            color: "#3b82f6",
            leadStatus: "new",
            name: "Novo",
            slaDays: 1,
            status: "open",
          },
          {
            color: "#22c55e",
            leadStatus: "won",
            name: "Ganho",
            slaDays: null,
            status: "won",
          },
        ],
      }),
      method: "POST",
    });
    expect(created.status).toBe(201);
    const pipeline = (await created.json()) as {
      id: string;
      stages: Array<{ id: string; name: string }>;
    };
    expect(pipeline.stages).toHaveLength(2);

    const listed = await app.request("/api/v1/crm/pipelines");
    expect(listed.status).toBe(200);
    await expect(listed.json()).resolves.toMatchObject({
      pipelines: [{ id: pipeline.id, name: "Vendas" }],
    });

    const updated = await app.request(`/api/v1/crm/pipelines/${pipeline.id}`, {
      body: JSON.stringify({
        description: "Pipeline comercial",
        stages: [{ ...pipeline.stages[0], color: "#0ea5e9", status: "open" }],
      }),
      method: "PATCH",
    });
    expect(updated.status).toBe(200);
    await expect(updated.json()).resolves.toMatchObject({
      description: "Pipeline comercial",
      stages: [{ color: "#0ea5e9", name: "Novo" }],
    });

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.pipeline.create" }),
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.pipeline.update" }),
    );
  });

  it("moves a lead to a pipeline stage and maps the coarse lead status", async () => {
    const { audit, record } = createAuditSpy();
    const app = createTestApp({ audit, permissions });
    const stageId = await createWonStage(app);
    const leadResponse = await app.request("/api/v1/crm/leads", {
      body: JSON.stringify({ buyerName: "Ana", source: "manual" }),
      method: "POST",
    });
    const lead = (await leadResponse.json()) as { id: string };

    const moved = await app.request(
      `/api/v1/crm/leads/${lead.id}/pipeline-stage`,
      {
        body: JSON.stringify({ pipelineStageId: stageId }),
        method: "PATCH",
      },
    );

    expect(moved.status).toBe(200);
    await expect(moved.json()).resolves.toMatchObject({
      id: lead.id,
      pipelineStageId: stageId,
      status: "won",
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.pipeline.lead_move" }),
    );
  });

  it("returns stable errors when moving without permission", async () => {
    const app = createTestApp({
      permissions: permissions.filter((item) => item !== "crm.pipeline.move"),
    });

    const response = await app.request(
      "/api/v1/crm/leads/lead-1/pipeline-stage",
      {
        body: JSON.stringify({
          pipelineStageId: "11111111-1111-4111-8111-111111111111",
        }),
        method: "PATCH",
      },
    );

    expect(response.status).toBe(403);
    await expectApiError(response, {
      code: "AUTHORIZATION_DENIED",
      message: "Missing permission: crm.pipeline.move",
    });
  });
});

async function createWonStage(app: ReturnType<typeof createTestApp>) {
  const response = await app.request("/api/v1/crm/pipelines", {
    body: JSON.stringify({
      name: "Vendas",
      stages: [
        {
          color: "#22c55e",
          leadStatus: "won",
          name: "Ganho",
          slaDays: null,
          status: "won",
        },
      ],
    }),
    method: "POST",
  });
  const pipeline = (await response.json()) as {
    stages: Array<{ id: string }>;
  };
  return pipeline.stages[0]!.id;
}
