import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { AuditEvent } from "../../../../shared/auditSink.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmWebhookEffect } from "../../ports/crmWebhookEventRepository.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { recoverOlxWebhookEffects } from "./recoverOlxWebhookEffects.js";

const connectionId = "24000000-0000-4000-8000-000000000101";
const effectId = "24000000-0000-4000-8000-000000000102";
const eventId = "24000000-0000-4000-8000-000000000103";
const messageId = "24000000-0000-4000-8000-000000000104";
const sessionId = "24000000-0000-4000-8000-000000000105";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const otherStoreId = "store_2" as StoreId;
const otherTenantId = "tenant_2" as TenantId;
const now = new Date("2026-08-10T12:01:00.000Z");

describe("recoverOlxWebhookEffects", () => {
  it("refuses a provider event outside the claimed effect scope", async () => {
    const record = vi.fn(async (_event: AuditEvent) => undefined);
    const logger = createLogger();
    const completeEffect = vi.fn(async () => effect({ status: "delivered" }));
    const failEffect = vi.fn(async () =>
      effect({
        lastErrorCode: "OlxWebhookEffectScopeError",
        status: "failed",
      }),
    );

    const result = await recoverOlxWebhookEffects(
      createServiceContext({
        actor: { id: "olx-recovery", kind: "system" },
        audit: { record },
        logger,
        permissions: ["crm.whatsapp.ingest"],
        request: { requestId: "request_1" },
      }),
      { limit: 1, now },
      createPorts({ completeEffect, failEffect, scopeMismatch: true }),
    );

    expect(result).toEqual({
      claimed: 1,
      completedEvents: 0,
      deadLettered: 0,
      delivered: 0,
      failed: 1,
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "crm.messaging.webhook.olx.recovery.effect",
        entityId: effectId,
        failureTier: "best_effort",
        outcome: "failed",
        storeId,
        tenantId,
      }),
    );
    const recoveryAudit = record.mock.calls
      .map(([event]) => event)
      .find(
        (event) => event.action === "crm.messaging.webhook.olx.recovery.effect",
      );
    expect(recoveryAudit?.metadata).toMatchObject({
      errorName: "OlxWebhookEffectScopeError",
      provider: "olx_chat",
      status: "failed",
    });
    expect(logger.warn).toHaveBeenCalledWith(
      "crm.messaging.webhook.olx.recovery.effect.failed",
      expect.objectContaining({
        effectId,
        errorName: "OlxWebhookEffectScopeError",
        providerEventId: eventId,
        status: "failed",
        storeId,
        tenantId,
      }),
    );
    expect(completeEffect).not.toHaveBeenCalled();
    expect(failEffect).toHaveBeenCalledOnce();
  });

  it("logs and audits a successfully recovered effect without payload data", async () => {
    const record = vi.fn(async (_event: AuditEvent) => undefined);
    const logger = createLogger();
    const completeEffect = vi.fn(async () => effect({ status: "delivered" }));
    const failEffect = vi.fn(async () => null);

    const result = await recoverOlxWebhookEffects(
      createServiceContext({
        actor: { id: "olx-recovery", kind: "system" },
        audit: { record },
        logger,
        permissions: ["crm.whatsapp.ingest"],
        request: { requestId: "request_2" },
      }),
      { limit: 1, now },
      createPorts({ completeEffect, failEffect }),
    );

    expect(result).toEqual({
      claimed: 1,
      completedEvents: 1,
      deadLettered: 0,
      delivered: 1,
      failed: 0,
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "crm.messaging.webhook.olx.recovery.effect",
        entityId: effectId,
        outcome: "succeeded",
        storeId,
        tenantId,
      }),
    );
    const recoveryAudit = record.mock.calls
      .map(([event]) => event)
      .find(
        (event) => event.action === "crm.messaging.webhook.olx.recovery.effect",
      );
    expect(recoveryAudit?.metadata).toMatchObject({
      effectType: "audit_accepted",
      provider: "olx_chat",
      status: "delivered",
    });
    expect(logger.info).toHaveBeenCalledWith(
      "crm.messaging.webhook.olx.recovery.started",
      expect.objectContaining({ limit: 1, requestId: "request_2" }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      "crm.messaging.webhook.olx.recovery.effect.succeeded",
      expect.objectContaining({ effectId, storeId, tenantId }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      "crm.messaging.webhook.olx.recovery.completed",
      expect.objectContaining({ delivered: 1, failed: 0 }),
    );
    expect(failEffect).not.toHaveBeenCalled();
  });
});

function createPorts(overrides: {
  completeEffect: (input: never) => Promise<CrmWebhookEffect | null>;
  failEffect: (input: never) => Promise<CrmWebhookEffect | null>;
  scopeMismatch?: boolean;
}): CrmServicePorts {
  return {
    crmConnectionRepository: {
      findConnectionById: vi.fn(async () => ({
        id: connectionId,
        provider: "olx_chat",
        storeId,
        tenantId,
      })),
    } as never,
    crmRepository: {} as never,
    crmWebhookEventRepository: {
      claimDueEffects: vi.fn(async () => [effect()]),
      completeEffect: overrides.completeEffect,
      failEffect: overrides.failEffect,
      findById: vi.fn(async () => ({
        connectionId,
        provider: "olx_chat",
        providerEventId: "olx-event-reference",
        storeId: overrides.scopeMismatch ? otherStoreId : storeId,
        tenantId: overrides.scopeMismatch ? otherTenantId : tenantId,
      })),
      listEffects: vi.fn(async () => [effect({ status: "delivered" })]),
      updateStatus: vi.fn(async () => null),
    } as never,
    crmWhatsappRepository: {
      findMessageById: vi.fn(async () => ({
        connectionId,
        id: messageId,
        sessionId,
        storeId,
        tenantId,
      })),
      listSessions: vi.fn(async () => [
        { connectionId, id: sessionId, storeId, tenantId },
      ]),
    } as never,
    crmRealtimePublisher: {
      publish: vi.fn(async () => undefined),
    },
  };
}

function createLogger() {
  return {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  };
}

function effect(overrides: Partial<CrmWebhookEffect> = {}): CrmWebhookEffect {
  return {
    connectionId,
    deadLetteredAt: null,
    deliveredAt: null,
    effectType: "audit_accepted",
    id: effectId,
    lastErrorCode: null,
    messageId,
    nextAttemptAt: now,
    processingAttempts: 1,
    processingStartedAt: now,
    processingToken: "processing-token",
    providerEventId: eventId,
    sequence: 10,
    sessionId,
    status: "processing",
    storeId,
    tenantId,
    ...overrides,
  };
}
