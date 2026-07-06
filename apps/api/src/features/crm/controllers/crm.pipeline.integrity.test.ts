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

describe("CRM pipeline integrity routes", () => {
  it("does not move a lead through generic lead update fields", async () => {
    const { audit, record } = createAuditSpy();
    const app = createTestApp({
      audit,
      permissions: permissions.filter((item) => item !== "crm.pipeline.move"),
    });
    const stageId = (await createPipeline(app, "Vendas", ["Ganho"])).stages[0]!
      .id;
    const leadResponse = await app.request("/api/v1/crm/leads", {
      body: JSON.stringify({ buyerName: "Ana", source: "manual" }),
      method: "POST",
    });
    const lead = (await leadResponse.json()) as { id: string };

    const updated = await app.request(`/api/v1/crm/leads/${lead.id}`, {
      body: JSON.stringify({
        buyerName: "Ana Maria",
        pipelineStageId: stageId,
      }),
      method: "PATCH",
    });

    expect(updated.status).toBe(200);
    await expect(updated.json()).resolves.toMatchObject({
      buyerName: "Ana Maria",
      pipelineStageId: null,
    });
    expect(record).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.pipeline.lead_move" }),
    );
  });

  it("returns stable errors for duplicate pipeline names", async () => {
    const app = createTestApp({ permissions });
    await createPipeline(app, "Vendas", ["Ganho"]);

    const response = await app.request("/api/v1/crm/pipelines", {
      body: JSON.stringify({
        name: "Vendas",
        stages: [
          {
            color: "#22c55e",
            leadStatus: "won",
            name: "Ganho",
            status: "won",
          },
        ],
      }),
      method: "POST",
    });

    expect(response.status).toBe(409);
    await expectApiError(response, {
      code: "CRM_PIPELINE_DUPLICATE_NAME",
      message: "CRM pipeline name already exists: Vendas",
    });
  });

  it("rejects deleting a pipeline while active leads reference it", async () => {
    const app = createTestApp({ permissions });
    const pipeline = await createPipeline(app, "Vendas", ["Novo"]);
    const lead = await createLead(app);
    await moveLead(app, lead.id, pipeline.stages[0]!.id);

    const response = await app.request(`/api/v1/crm/pipelines/${pipeline.id}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(409);
    await expectApiError(response, {
      code: "CRM_PIPELINE_IN_USE",
      message: "CRM pipeline is in use by active leads and cannot be deleted.",
    });
  });

  it("rejects removing a stage while active leads reference it", async () => {
    const app = createTestApp({ permissions });
    const pipeline = await createPipeline(app, "Vendas", ["Novo", "Ganho"]);
    const lead = await createLead(app);
    await moveLead(app, lead.id, pipeline.stages[1]!.id);

    const response = await app.request(`/api/v1/crm/pipelines/${pipeline.id}`, {
      body: JSON.stringify({ stages: [pipeline.stages[0]] }),
      method: "PATCH",
    });

    expect(response.status).toBe(409);
    await expectApiError(response, {
      code: "CRM_PIPELINE_IN_USE",
      message:
        "CRM pipeline stage is in use by active leads and cannot be removed.",
    });
  });
});

async function createLead(app: ReturnType<typeof createTestApp>) {
  const response = await app.request("/api/v1/crm/leads", {
    body: JSON.stringify({ buyerName: "Ana", source: "manual" }),
    method: "POST",
  });
  return (await response.json()) as { id: string };
}

async function moveLead(
  app: ReturnType<typeof createTestApp>,
  leadId: string,
  stageId: string,
) {
  await app.request(`/api/v1/crm/leads/${leadId}/pipeline-stage`, {
    body: JSON.stringify({ pipelineStageId: stageId }),
    method: "PATCH",
  });
}

async function createPipeline(
  app: ReturnType<typeof createTestApp>,
  name: string,
  stageNames: string[],
) {
  const response = await app.request("/api/v1/crm/pipelines", {
    body: JSON.stringify({
      name,
      stages: stageNames.map((stageName) => ({
        color: "#22c55e",
        leadStatus: stageName === "Ganho" ? "won" : "new",
        name: stageName,
        slaDays: null,
        status: stageName === "Ganho" ? "won" : "open",
      })),
    }),
    method: "POST",
  });
  return (await response.json()) as {
    id: string;
    stages: Array<{
      color: string;
      id: string;
      leadStatus: string;
      name: string;
      status: string;
    }>;
  };
}
