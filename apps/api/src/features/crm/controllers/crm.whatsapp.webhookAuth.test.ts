import type { AuditSink } from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import {
  connectionA,
  connectionB,
  createWebhookAuthApp,
  postReceived,
  storeId,
  tenantId,
} from "./crm.whatsapp.webhookAuth.testSupport.js";

describe("CRM WhatsApp webhook authentication", () => {
  it("requires the secret sealed for the addressed connection", async () => {
    const app = createWebhookAuthApp();

    expect((await postReceived(app, connectionA)).status).toBe(403);
    expect((await postReceived(app, connectionA, "wrong-secret")).status).toBe(
      403,
    );
  });

  it("binds the token-authenticated connection scope before ingestion", async () => {
    const auditRecord = vi.fn<AuditSink["record"]>(async () => undefined);
    const audit = { record: auditRecord };
    const app = createWebhookAuthApp(["crm"], audit);

    expect((await postReceived(app, connectionA, "secret-a")).status).toBe(201);
    const authorizationAudits = auditRecord.mock.calls
      .map(([event]) => event)
      .filter(
        (event) => event.action === "crm.provider.zapi.webhook.authorize",
      );
    expect(authorizationAudits).toMatchObject([
      { outcome: "attempted" },
      { outcome: "succeeded", storeId, tenantId },
    ]);
  });

  it("rejects a valid secret from another store connection", async () => {
    const app = createWebhookAuthApp();

    const forged = await postReceived(app, connectionB, "secret-a");

    expect(forged.status).toBe(403);
    await expect(forged.json()).resolves.toMatchObject({
      code: "AUTHORIZATION_DENIED",
      message: "Invalid CRM WhatsApp webhook token.",
    });
  });

  it("fails closed when the authenticated store lacks crm", async () => {
    const auditRecord = vi.fn<AuditSink["record"]>(async () => undefined);
    const audit = { record: auditRecord };
    const app = createWebhookAuthApp([], audit);

    const response = await postReceived(app, connectionA, "secret-a");

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "AUTHORIZATION_DENIED",
      message: "Invalid CRM WhatsApp webhook token.",
    });
    const authorizationAudits = auditRecord.mock.calls
      .map(([event]) => event)
      .filter(
        (event) => event.action === "crm.provider.zapi.webhook.authorize",
      );
    expect(authorizationAudits).toMatchObject([
      { outcome: "attempted" },
      {
        outcome: "failed",
        storeId,
        tenantId,
      },
    ]);
    expect(authorizationAudits[1]?.metadata).toMatchObject({
      reason: "entitlement_missing",
    });
    expect(authorizationAudits).not.toContainEqual(
      expect.objectContaining({ outcome: "succeeded" }),
    );
  });
});
