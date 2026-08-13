import { describe, expect, it } from "vitest";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import type { CrmPipeline } from "../../../domains/crm/ports/crmPipelineRepository.js";
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
  it("places a newly created lead in the default pipeline", async () => {
    const app = createTestApp({ permissions });

    const response = await app.request("/api/v1/crm/leads", {
      body: JSON.stringify({ buyerName: "Ana", source: "manual" }),
      method: "POST",
    });

    expect(response.status).toBe(201);
    const lead = (await response.json()) as {
      pipelineId: unknown;
      pipelineStageId: unknown;
      status: string;
    };
    expect(typeof lead.pipelineId).toBe("string");
    expect(typeof lead.pipelineStageId).toBe("string");
    expect(lead.status).toBe("new");

    const pipelinesResponse = await app.request("/api/v1/crm/pipelines");
    const payload = (await pipelinesResponse.json()) as {
      pipelines: Array<{
        isDefault: boolean;
        stages: Array<{ status: string }>;
      }>;
    };
    expect(
      payload.pipelines.some(
        (pipeline) =>
          pipeline.isDefault &&
          pipeline.stages.some((stage) => stage.status === "open"),
      ),
    ).toBe(true);
  });

  it("archives and restores a lead without deleting its detail", async () => {
    const { audit, record } = createAuditSpy();
    const app = createTestApp({ audit, permissions });
    const lead = await createLead(app);

    const archived = await app.request(`/api/v1/crm/leads/${lead.id}/archive`, {
      method: "POST",
    });
    expect(archived.status).toBe(200);
    await expect(archived.json()).resolves.toMatchObject({
      status: "archived",
    });
    const list = await app.request("/api/v1/crm/leads");
    await expect(list.json()).resolves.toMatchObject({ leads: [], total: 0 });
    const detail = await app.request(`/api/v1/crm/leads/${lead.id}`);
    expect(detail.status).toBe(200);

    const restored = await app.request(`/api/v1/crm/leads/${lead.id}/restore`, {
      method: "POST",
    });
    expect(restored.status).toBe(200);
    await expect(restored.json()).resolves.toMatchObject({ status: "new" });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.lead.archive" }),
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.lead.restore" }),
    );
  });

  it("reuses the active attendance when a manual lead has the same phone", async () => {
    const app = createTestApp({ permissions });
    const first = await app.request("/api/v1/crm/leads", {
      body: JSON.stringify({ buyerPhone: "5511999999999", source: "whatsapp" }),
      method: "POST",
    });
    const whatsappLead = (await first.json()) as { id: string };

    const duplicate = await app.request("/api/v1/crm/leads", {
      body: JSON.stringify({
        buyerName: "Ana cadastrada manualmente",
        buyerPhone: "(11) 99999-9999",
        source: "manual",
      }),
      method: "POST",
    });

    expect(duplicate.status).toBe(201);
    await expect(duplicate.json()).resolves.toMatchObject({
      buyerName: "Ana cadastrada manualmente",
      id: whatsappLead.id,
      source: "whatsapp",
    });
  });

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
    const updatedLead = (await updated.json()) as {
      buyerName: string;
      pipelineStageId: string;
    };
    expect(updatedLead.buyerName).toBe("Ana Maria");
    expect(typeof updatedLead.pipelineStageId).toBe("string");
    expect(updatedLead.pipelineStageId).not.toBe(stageId);
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
  return (await response.json()) as Pick<CrmPipeline, "id" | "stages">;
}
