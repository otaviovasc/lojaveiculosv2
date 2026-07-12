import { describe, expect, it } from "vitest";
import {
  createAutomationTestApp,
  createPreview,
} from "./automation.controller.testSupport.js";

describe("automation authorization and isolation", () => {
  it("fails closed without the entitlement or action permission", async () => {
    const withoutEntitlement = createAutomationTestApp({ entitlements: [] });
    const entitlementResponse = await createPreview(withoutEntitlement.app);
    expect(entitlementResponse.response.status).toBe(403);
    expect(entitlementResponse.body).toEqual(
      expect.objectContaining({ code: "AUTHORIZATION_DENIED" }),
    );

    const withoutRunPermission = createAutomationTestApp({
      permissions: ["automation.read"],
    });
    const permissionResponse = await createPreview(withoutRunPermission.app);
    expect(permissionResponse.response.status).toBe(403);
    expect(permissionResponse.body).toEqual(
      expect.objectContaining({ code: "AUTHORIZATION_DENIED" }),
    );
  });

  it("requires a user actor and never resolves runs across store scope", async () => {
    const integration = createAutomationTestApp({ actorKind: "integration" });
    const authResponse = await createPreview(integration.app);
    expect(authResponse.response.status).toBe(401);
    expect(authResponse.body).toEqual(
      expect.objectContaining({ code: "HTTP_AUTHENTICATION_REQUIRED" }),
    );

    const { app } = createAutomationTestApp();
    const created = await createPreview(app, { storeId: "store_a" });
    const isolated = await app.request(
      `/api/v1/automation/runs/${created.body.data.id}`,
      { headers: { "x-test-store": "store_b" } },
    );
    expect(isolated.status).toBe(404);
    expect(await isolated.json()).toEqual(
      expect.objectContaining({ code: "AUTOMATION_RUN_NOT_FOUND" }),
    );
  });

  it("authenticates before parsing an untrusted request body", async () => {
    const { app } = createAutomationTestApp({ actorKind: "integration" });
    const response = await app.request("/api/v1/automation/runs", {
      body: "{not-json",
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual(
      expect.objectContaining({ code: "HTTP_AUTHENTICATION_REQUIRED" }),
    );
  });

  it("returns stable validation errors for malformed decisions", async () => {
    const { app } = createAutomationTestApp();
    const created = await createPreview(app);
    const stepId = created.body.data.steps[0]?.id;
    const response = await app.request(
      `/api/v1/automation/runs/${created.body.data.id}/steps/${stepId}/approve`,
      {
        body: JSON.stringify({
          expectedApprovalVersion: 1,
          expectedProposalDigest: "not-a-digest",
          expectedRunVersion: 1,
          expectedStepVersion: 1,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      code: string;
      requestId: string;
    };
    expect(body.code).toBe("AUTOMATION_REQUEST_VALIDATION_FAILED");
    expect(body.requestId).toEqual(expect.any(String));
  });
});
