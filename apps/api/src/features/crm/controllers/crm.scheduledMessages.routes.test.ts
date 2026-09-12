import { describe, expect, it } from "vitest";
import { expectApiError } from "./crm.controller.testSupport.js";
import {
  canonicalConnection,
  capabilities,
  connectionId,
  schedule,
  scheduledFixture,
} from "./crm.scheduledMessages.routes.testSupport.js";

describe("CRM scheduled-message routes", () => {
  it("uses the server-owned default route with scheduling capability", async () => {
    const fixture = await scheduledFixture();

    const response = await schedule(fixture.app, fixture.cycleId);

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      connectionId,
      cycleId: fixture.cycleId,
      status: "pending",
    });
  });

  it.each([
    [
      "unsupported",
      { capabilities: capabilities({ scheduling: false }) },
      "capability_unsupported",
    ],
    ["disconnected", { connected: false }, "connection_not_connected"],
  ])("rejects a %s server-owned route", async (_label, override, reason) => {
    const fixture = await scheduledFixture({ connection: override });

    const response = await schedule(fixture.app, fixture.cycleId);

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      code: "CRM_ROUTING_POLICY_BLOCKED",
      details: { reason },
    });
  });

  it("rejects a stale default instead of falling back to the cycle connection", async () => {
    const fixture = await scheduledFixture({
      defaultConnectionId: "missing-default-connection",
    });

    const response = await schedule(fixture.app, fixture.cycleId);

    expect(response.status).toBe(422);
    const body = (await response.json()) as {
      code: string;
      details?: { reason?: string };
    };
    expect(body).toMatchObject({
      code: "CRM_ROUTING_POLICY_BLOCKED",
      details: { reason: "connection_not_found" },
    });
  });

  it("rejects a cycle bound to a connection outside the configured default route", async () => {
    const fixture = await scheduledFixture({
      additionalConnection: canonicalConnection({ id: "configured-default" }),
      defaultConnectionId: "configured-default",
    });

    const response = await schedule(fixture.app, fixture.cycleId);

    expect(response.status).toBe(409);
    await expectApiError(response, {
      code: "CRM_MESSAGE_ACTION_ERROR",
      message:
        "The conversation connection does not match the configured scheduled-message route.",
    });
  });

  it("denies missing create permission and CRM entitlement", async () => {
    const withoutPermission = await scheduledFixture({ permissions: [] });
    const permissionResponse = await schedule(
      withoutPermission.app,
      withoutPermission.cycleId,
    );
    expect(permissionResponse.status).toBe(403);
    await expectApiError(permissionResponse, {
      code: "AUTHORIZATION_DENIED",
      message: "Missing permission: crm.scheduled_messages.create",
    });

    const withoutEntitlement = await scheduledFixture({ entitlements: [] });
    const entitlementResponse = await schedule(
      withoutEntitlement.app,
      withoutEntitlement.cycleId,
    );
    expect(entitlementResponse.status).toBe(403);
    await expectApiError(entitlementResponse, {
      code: "AUTHORIZATION_DENIED",
      message: "Missing entitlement: crm",
    });
  });
});
