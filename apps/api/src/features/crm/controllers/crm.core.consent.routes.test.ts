import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createMemoryCrmCoreRepository } from "../../../domains/crm/testSupportCore.js";
import { handleCrmCore } from "./crm.core.errors.js";
import { registerCrmCoreRoutes } from "./crm.core.routes.js";

describe("CRM core consent route contract", () => {
  it("requires complete evidence and dedicated permission", async () => {
    const repository = createMemoryCrmCoreRepository();
    const person = await repository.create({
      data: {
        disputed: false,
        displayName: "Person",
        mergedIntoContactId: null,
      },
      resource: "contacts",
      scope: scope(),
    });
    const payload = {
      channel: "whatsapp",
      contactId: person.id,
      decision: "opt_in",
      evidence: "consent-receipt-reference",
      occurredAt: "2026-08-12T12:00:00.000Z",
      policyVersion: "2026-08",
      purpose: "commercial_messaging",
      source: "manual",
    };
    const manager = appFor(repository, ["crm.access", "crm.manage"]);
    expect(
      (
        await manager.request("/consents", {
          body: JSON.stringify(payload),
          headers: jsonHeaders,
          method: "POST",
        })
      ).status,
    ).toBe(403);
    const authorized = appFor(repository, ["crm.access", "crm.consent.record"]);
    expect(
      (
        await authorized.request("/consents", {
          body: JSON.stringify({ ...payload, policyVersion: undefined }),
          headers: jsonHeaders,
          method: "POST",
        })
      ).status,
    ).toBe(400);
    const recorded = await authorized.request("/consents", {
      body: JSON.stringify(payload),
      headers: jsonHeaders,
      method: "POST",
    });
    expect(recorded.status).toBe(201);
    await expect(recorded.json()).resolves.toMatchObject({
      evidence: payload.evidence,
      policyVersion: payload.policyVersion,
      purpose: payload.purpose,
      source: payload.source,
      status: "opt_in",
    });
  });
});

const jsonHeaders = { "content-type": "application/json" };

function appFor(
  repository: ReturnType<typeof createMemoryCrmCoreRepository>,
  permissions: string[],
) {
  const app = new Hono();
  registerCrmCoreRoutes(app, {
    createContext: async () =>
      createServiceContext({
        actor: { id: "user-a", kind: "user" },
        entitlements: ["crm"],
        permissions,
        request: { requestId: "request-a" },
        ...scope(),
      }),
    handleCrm: handleCrmCore,
    repository,
  });
  return app;
}

function scope() {
  return { storeId: "store-a", tenantId: "tenant-a" };
}
