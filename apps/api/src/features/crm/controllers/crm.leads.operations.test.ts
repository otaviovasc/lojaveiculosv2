import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";

const scope = {
  storeId: "store_1" as StoreId,
  tenantId: "tenant_1" as TenantId,
};
const stageId = "11111111-1111-4111-8111-111111111111";
const pipelineId = "22222222-2222-4222-8222-222222222222";

describe("CRM operational lead queries", () => {
  it("uses communication instead of creation/status and keeps task ordering across pages", async () => {
    const repository = createMemoryCrmRepository();
    const app = createTestApp({
      crmRepository: repository,
      permissions: ["lead.read"],
    });
    const leads = [];
    for (let i = 0; i < 5; i++)
      leads.push(
        await repository.createLead({
          ...scope,
          buyerName: `Lead ${i}`,
          source: "manual",
          pipelineId,
          pipelineStageId: stageId,
        }),
      );
    await repository.updateLead({
      ...scope,
      leadId: leads[0]!.id,
      status: "qualified",
    });
    await repository.createActivity({
      ...scope,
      leadId: leads[1]!.id,
      activityType: "message",
      direction: "outbound",
      content: "Olá",
      occurredAt: new Date(Date.now() - 10 * 86400000),
    });
    await repository.createActivity({
      ...scope,
      leadId: leads[2]!.id,
      activityType: "call",
      direction: "inbound",
      content: "Ligação",
      occurredAt: new Date(),
    });
    for (const i of [0, 1, 2])
      await repository.createActivity({
        ...scope,
        leadId: leads[i]!.id,
        activityType: "task",
        content: "Retornar",
        metadata: { dueAt: `2026-09-${10 + i}T10:00:00-03:00` },
      });
    const responded = await app.request(
      "/api/v1/crm/leads?responseState=responded&inactiveDays=7",
    );
    expect(responded.status).toBe(200);
    expect(await responded.json()).toMatchObject({
      total: 1,
      leads: [{ id: leads[1]!.id }],
    });
    const board = await app.request(
      `/api/v1/crm/leads/board?pipelineId=${pipelineId}&sortBy=next_task&stageLimit=2`,
    );
    const page = (await board.json()) as {
      stages: Array<{
        leads: Array<{ id: string }>;
        nextCursor: string;
        total: number;
      }>;
    };
    expect(page.stages[0]?.total).toBe(5);
    expect(page.stages[0]?.leads.map((l) => l.id)).toEqual([
      leads[0]!.id,
      leads[1]!.id,
    ]);
    const second = await app.request(
      `/api/v1/crm/leads?pipelineId=${pipelineId}&sortBy=next_task&limit=2&cursor=${page.stages[0]!.nextCursor}`,
    );
    const secondPage = (await second.json()) as {
      leads: Array<{ id: string }>;
      nextCursor: string;
    };
    expect(secondPage.leads[0]?.id).toBe(leads[2]!.id);
    const third = await app.request(
      `/api/v1/crm/leads?pipelineId=${pipelineId}&sortBy=next_task&limit=2&cursor=${secondPage.nextCursor}`,
    );
    const thirdPage = (await third.json()) as { leads: Array<{ id: string }> };
    expect(
      new Set(
        [...page.stages[0]!.leads, ...secondPage.leads, ...thirdPage.leads].map(
          (l) => l.id,
        ),
      ).size,
    ).toBe(5);
    const invalid = await app.request(
      `/api/v1/crm/leads?cursor=${page.stages[0]!.nextCursor}`,
    );
    expect(invalid.status).toBe(400);
  });

  it("validates filters and enforces lead read authorization", async () => {
    const app = createTestApp({ permissions: ["lead.read"] });
    for (const query of [
      "inactiveDays=-1",
      "inactiveDays=1.5",
      "humanAttendanceState=assigned",
      "responseState=new",
    ]) {
      expect((await app.request(`/api/v1/crm/leads?${query}`)).status).toBe(
        400,
      );
    }
    expect(
      (
        await createTestApp({ permissions: [] }).request(
          "/api/v1/crm/leads?responseState=responded",
        )
      ).status,
    ).toBe(403);
  });
});

describe("CSV lead import", () => {
  it("can recognize closed contacts without changing normal active-lead lookup", async () => {
    const repo = createMemoryCrmRepository();
    const lead = await repo.createLead({
      ...scope,
      buyerPhone: "5511999991234",
      source: "manual",
    });
    await repo.updateLead({ ...scope, leadId: lead.id, status: "won" });
    expect(
      await repo.findLeadByPhone({ ...scope, buyerPhone: "11999991234" }),
    ).toBeNull();
    expect(
      await repo.findLeadByPhone({
        ...scope,
        buyerPhone: "11999991234",
        includeClosed: true,
      }),
    ).toMatchObject({ id: lead.id, status: "won" });
  });
  it("validates rows, deduplicates normalized phones and emails and safely retries", async () => {
    const app = createTestApp({
      permissions: ["lead.create", "lead.read", "crm.pipeline.manage"],
    });
    const response = await app.request("/api/v1/crm/pipelines", {
      method: "POST",
      body: JSON.stringify({
        name: "Import",
        stages: [
          { name: "Novo", color: "#123456", status: "open", leadStatus: "new" },
        ],
      }),
    });
    const pipeline = (await response.json()) as {
      stages: Array<{ id: string }>;
    };
    const body = JSON.stringify({
      pipelineStageId: pipeline.stages[0]!.id,
      idempotencyKey: "import-test-1",
      rows: [
        { buyerName: "Ana", buyerPhone: "(11) 99999-1234" },
        { buyerName: "Ana repetida", buyerPhone: "+55 11 99999-1234" },
        { buyerName: "Bia", buyerEmail: " BIA@example.com " },
        { buyerName: "Bia repetida", buyerEmail: "bia@example.com" },
        { buyerName: "Sem contato" },
      ],
    });
    const result = await app.request("/api/v1/crm/leads/import", {
      method: "POST",
      body,
    });
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({
      created: 2,
      skipped: 2,
      errors: [{ row: 5 }],
    });
    const retry = await app.request("/api/v1/crm/leads/import", {
      method: "POST",
      body,
    });
    expect(await retry.json()).toMatchObject({
      created: 0,
      skipped: 4,
      errors: [{ row: 5 }],
    });
    expect(await (await app.request("/api/v1/crm/leads")).json()).toMatchObject(
      { total: 2 },
    );
    const unauthorized = await createTestApp({ permissions: [] }).request(
      "/api/v1/crm/leads/import",
      { method: "POST", body },
    );
    expect(unauthorized.status).toBe(403);
    const wrongStage = await app.request("/api/v1/crm/leads/import", {
      method: "POST",
      body: JSON.stringify({ ...JSON.parse(body), pipelineStageId: stageId }),
    });
    expect(wrongStage.status).toBe(404);
  });
});
