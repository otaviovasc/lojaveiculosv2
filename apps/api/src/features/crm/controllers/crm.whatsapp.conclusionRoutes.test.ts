import { describe, expect, it } from "vitest";
import {
  createConclusionFixture,
  storeId,
  tenantId,
} from "./crm.whatsapp.conclusionRoutes.testSupport.js";

describe("POST CRM WhatsApp attendance conclusion", () => {
  it("applies and replays follow-up without moving the lead or duplicating its task", async () => {
    const fixture = await createConclusionFixture();
    const request = () =>
      fixture.app.request(
        `/api/v1/crm/whatsapp/sessions/${fixture.originId}/conclusion`,
        {
          body: JSON.stringify({
            commandId: "follow-up-command",
            outcome: "follow_up",
            reminder: { dueAt: "2026-08-20T15:00:00.000Z" },
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );

    const first = await request();
    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toMatchObject({
      result: "applied",
      session: { assignedUserId: null, status: "COMPLETED" },
    });
    const replay = await request();
    await expect(replay.json()).resolves.toMatchObject({
      result: "already_applied",
    });

    const lead = await fixture.crmRepository.findLeadById({
      leadId: fixture.leadId,
      storeId,
      tenantId,
    });
    expect(lead).toMatchObject({
      assignedUserId: "seller_1",
      pipelineId: fixture.pipelineId,
      pipelineStageId: fixture.openStageId,
      status: "new",
    });
    const sessions = await fixture.whatsappRepository.listSessions({
      leadId: fixture.leadId,
      limit: 10,
      offset: 0,
      storeId,
      tenantId,
    });
    expect(sessions.find((item) => item.id === fixture.otherId)?.status).toBe(
      "ACTIVE",
    );
    const activities = await fixture.crmRepository.listActivities({
      leadId: fixture.leadId,
      limit: 10,
      storeId,
      tenantId,
    });
    expect(activities).toHaveLength(1);
    expect(activities[0]?.metadata).toEqual({
      task: {
        dueAt: "2026-08-20T15:00:00.000Z",
        kind: "follow_up",
        originSessionId: fixture.originId,
      },
    });
  });

  it("coalesces concurrent retries of the same conclusion command", async () => {
    const fixture = await createConclusionFixture();
    const request = () =>
      fixture.app.request(
        `/api/v1/crm/whatsapp/sessions/${fixture.originId}/conclusion`,
        {
          body: JSON.stringify({
            commandId: "concurrent-follow-up",
            outcome: "follow_up",
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );

    const responses = await Promise.all([request(), request()]);
    const bodies = await Promise.all(
      responses.map(
        async (response) =>
          (await response.json()) as {
            result: "already_applied" | "applied";
          },
      ),
    );

    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(bodies.map((body) => body.result).sort()).toEqual([
      "already_applied",
      "applied",
    ]);
  });

  it("moves a lost lead by stage status and completes every active channel session", async () => {
    const fixture = await createConclusionFixture();
    const response = await fixture.app.request(
      `/api/v1/crm/whatsapp/sessions/${fixture.originId}/conclusion`,
      {
        body: JSON.stringify({
          commandId: "lost-command",
          outcome: "lost",
          reason: "price",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ result: "applied" });

    const lead = await fixture.crmRepository.findLeadById({
      leadId: fixture.leadId,
      storeId,
      tenantId,
    });
    expect(lead).toMatchObject({ assignedUserId: "seller_1", status: "lost" });
    const lostStage = fixture.pipeline.stages.find(
      (stage) => stage.status === "lost",
    );
    expect(lead?.pipelineStageId).toBe(lostStage?.id);
    const sessions = await fixture.whatsappRepository.listSessions({
      leadId: fixture.leadId,
      limit: 10,
      offset: 0,
      storeId,
      tenantId,
    });
    expect(sessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ assignedUserId: null, status: "COMPLETED" }),
        expect.objectContaining({ assignedUserId: null, status: "COMPLETED" }),
      ]),
    );
    await expect(
      fixture.outcomeRepository.findByCommandId({
        commandId: "lost-command",
        storeId,
        tenantId,
      }),
    ).resolves.toMatchObject({
      leadId: fixture.leadId,
      lossReason: "price",
      outcome: "lost",
      originSessionId: fixture.originId,
      previousPipelineStageId: fixture.openStageId,
      result: "applied",
    });
  });

  it("repairs a missing terminal stage before applying the outcome", async () => {
    const fixture = await createConclusionFixture();
    await fixture.crmPipelineRepository.updatePipeline({
      pipelineId: fixture.pipelineId,
      stages: fixture.pipeline.stages.filter(
        (stage) => stage.status !== "lost",
      ),
      storeId,
      tenantId,
    });

    const response = await fixture.app.request(
      `/api/v1/crm/whatsapp/sessions/${fixture.originId}/conclusion`,
      {
        body: JSON.stringify({
          commandId: "repair-and-lose",
          outcome: "lost",
          reason: "vehicle_unavailable",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(200);
    const repaired = await fixture.crmPipelineRepository.findPipelineById({
      pipelineId: fixture.pipelineId,
      storeId,
      tenantId,
    });
    expect(repaired?.stages.some((stage) => stage.status === "lost")).toBe(
      true,
    );
    const lead = await fixture.crmRepository.findLeadById({
      leadId: fixture.leadId,
      storeId,
      tenantId,
    });
    expect(lead?.status).toBe("lost");
  });

  it("requires a note for the other loss reason", async () => {
    const fixture = await createConclusionFixture();
    const response = await fixture.app.request(
      `/api/v1/crm/whatsapp/sessions/${fixture.originId}/conclusion`,
      {
        body: JSON.stringify({
          commandId: "invalid-other",
          outcome: "lost",
          reason: "other",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );
    expect(response.status).toBe(400);
  });
});
