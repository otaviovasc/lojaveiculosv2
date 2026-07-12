import { describe, expect, it } from "vitest";
import {
  createAutomationTestApp,
  createPreview,
  type AutomationResponse,
} from "./automation.controller.testSupport.js";

describe("automation controller", () => {
  it("creates, lists, and reads a deterministic preview envelope", async () => {
    const { app, audit } = createAutomationTestApp();
    const created = await createPreview(app);

    expect(created.response.status).toBe(201);
    expect(created.body.data).toEqual(
      expect.objectContaining({
        executionEnabled: false,
        objective: "Review inventory readiness",
        pendingApprovalCount: 1,
        status: "awaiting_approval",
        stepCount: 1,
        version: 1,
      }),
    );
    expect(created.body.data.steps[0]).toEqual(
      expect.objectContaining({
        executionEnabled: false,
        kind: "read_only_preview",
        status: "awaiting_approval",
        version: 1,
      }),
    );
    expect(created.body.data.steps[0]?.approval.proposalDigest).toMatch(
      /^[a-f0-9]{64}$/,
    );

    const listResponse = await app.request(
      "/api/v1/automation/runs?limit=10&offset=0",
    );
    expect(listResponse.status).toBe(200);
    expect(await listResponse.json()).toEqual({
      data: [
        expect.objectContaining({
          id: created.body.data.id,
          pendingApprovalCount: 1,
          stepCount: 1,
        }),
      ],
      meta: { limit: 10, offset: 0, total: 1 },
    });

    const detailResponse = await app.request(
      `/api/v1/automation/runs/${created.body.data.id}`,
    );
    expect(detailResponse.status).toBe(200);
    const detailBody = (await detailResponse.json()) as AutomationResponse;
    expect(detailBody.data.id).toBe(created.body.data.id);
    expect(audit.events.map((event) => event.action)).toEqual([
      "automation.preview.create",
      "automation.runs.list",
      "automation.run.get",
    ]);
  });

  it("binds approval to all versions and the exact proposal digest", async () => {
    const { app } = createAutomationTestApp();
    const created = await createPreview(app);
    const step = created.body.data.steps[0];
    expect(step).toBeDefined();
    const decision = {
      expectedApprovalVersion: step?.approval.version,
      expectedProposalDigest: step?.approval.proposalDigest,
      expectedRunVersion: created.body.data.version,
      expectedStepVersion: step?.version,
    };
    const path =
      `/api/v1/automation/runs/${created.body.data.id}` +
      `/steps/${step?.id}/approve`;
    const approved = await app.request(path, jsonPost(decision));

    expect(approved.status).toBe(200);
    const approvedBody = (await approved.json()) as AutomationResponse;
    expect(approvedBody.data.status).toBe("approved");
    expect(approvedBody.data.version).toBe(2);
    expect(approvedBody.data.steps[0]?.approval.status).toBe("approved");
    expect(approvedBody.data.steps[0]?.approval.version).toBe(2);

    const stale = await app.request(path, jsonPost(decision));
    expect(stale.status).toBe(409);
    expect(await stale.json()).toEqual(
      expect.objectContaining({ code: "AUTOMATION_STALE_APPROVAL" }),
    );
  });

  it("supports reject and version-checked cancel as terminal decisions", async () => {
    const { app } = createAutomationTestApp();
    const rejectedRun = await createPreview(app, { objective: "Reject this" });
    const rejectedStep = rejectedRun.body.data.steps[0];
    const rejectPath =
      `/api/v1/automation/runs/${rejectedRun.body.data.id}` +
      `/steps/${rejectedStep?.id}/reject`;
    const rejected = await app.request(
      rejectPath,
      jsonPost({
        expectedApprovalVersion: rejectedStep?.approval.version,
        expectedProposalDigest: rejectedStep?.approval.proposalDigest,
        expectedRunVersion: rejectedRun.body.data.version,
        expectedStepVersion: rejectedStep?.version,
      }),
    );
    expect(((await rejected.json()) as AutomationResponse).data.status).toBe(
      "rejected",
    );

    const pending = await createPreview(app, { objective: "Cancel this" });
    const cancel = await app.request(
      `/api/v1/automation/runs/${pending.body.data.id}/cancel`,
      jsonPost({ expectedRunVersion: pending.body.data.version }),
    );
    const cancelled = (await cancel.json()) as AutomationResponse;
    expect(cancelled.data.status).toBe("cancelled");
    expect(cancelled.data.steps[0]?.approval.decidedByActorId).toBe("user_1");
    const staleCancel = await app.request(
      `/api/v1/automation/runs/${pending.body.data.id}/cancel`,
      jsonPost({ expectedRunVersion: 1 }),
    );
    expect(staleCancel.status).toBe(409);
  });
});

function jsonPost(body: unknown) {
  return {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  };
}
