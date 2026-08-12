import type { AuditEvent } from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWebhookEventRepository } from "../adapters/memory/crmWebhookEventRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  createOlxConnection,
  olxSecurity,
  postOlx,
  storeId,
  tenantId,
  validPayload,
} from "./crm.olxChat.testSupport.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

describe("CRM OLX Chat runtime", () => {
  it("rejects and audits a divergent replay for the same provider message id", async () => {
    const auditEvents: AuditEvent[] = [];
    const webhookEventRepository = createMemoryCrmWebhookEventRepository();
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const app = createTestApp({
      audit: { record: vi.fn(async (event) => void auditEvents.push(event)) },
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createOlxConnection(),
      ]),
      crmWhatsappRepository: whatsappRepository,
      crmWebhookEventRepository: webhookEventRepository,
      entitlements: ["crm"],
      crmOlxWebhookSecurity: olxSecurity(),
      olxChatEnabled: true,
    });

    expect((await postOlx(app, validPayload())).status).toBe(201);
    const conflict = await postOlx(app, {
      ...validPayload(),
      email: "another@example.com",
      message: "A different message",
    });

    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toMatchObject({
      code: "CRM_OLX_WEBHOOK_REPLAY_CONFLICT",
    });
    const conflictAudit = auditEvents.find(
      (event) => event.action === "crm.messaging.webhook.olx.rejected",
    );
    expect(conflictAudit?.metadata).toMatchObject({
      reason: "divergent_replay",
    });
    expect(conflictAudit?.storeId).toBe(storeId);
    expect(conflictAudit?.tenantId).toBe(tenantId);
    expect(JSON.stringify(auditEvents)).not.toContain("another@example.com");
    expect(JSON.stringify(auditEvents)).not.toContain("A different message");
    const [event] = await webhookEventRepository.list({
      limit: 10,
      storeId,
      tenantId,
    });
    expect(event?.payload).toEqual({ schemaVersion: 1 });
    expect(event?.payloadDigest).toMatch(/^[0-9a-f]{64}$/u);
    expect(JSON.stringify(event)).not.toContain("another@example.com");
    expect(JSON.stringify(event)).not.toContain("A different message");
    const [session] = await whatsappRepository.listSessions({
      limit: 10,
      offset: 0,
      storeId,
      tenantId,
    });
    await expect(
      whatsappRepository.listMessages({
        limit: 10,
        offset: 0,
        sessionId: session!.id,
        storeId,
        tenantId,
      }),
    ).resolves.toHaveLength(1);
  });
});
