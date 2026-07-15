import type { PermissionKey } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

describe("CRM commercial entitlement boundary", () => {
  it("keeps customers and pipelines available without the WhatsApp add-on", async () => {
    const app = createTestApp({
      entitlements: [],
      permissions: ["lead.read", "crm.pipeline.read"] satisfies PermissionKey[],
    });

    const [customers, pipelines] = await Promise.all([
      app.request("/api/v1/crm/leads"),
      app.request("/api/v1/crm/pipelines"),
    ]);

    expect(customers.status).toBe(200);
    expect(pipelines.status).toBe(200);
  });

  it("keeps WhatsApp blocked without the CRM add-on", async () => {
    const app = createTestApp({
      entitlements: [],
      permissions: [
        "crm.whatsapp.list",
        "crm.whatsapp.read",
      ] satisfies PermissionKey[],
    });

    const response = await app.request("/api/v1/crm/whatsapp/sessions");

    expect(response.status).toBe(403);
  });
});
