import type { CrmMessagingGateway } from "../../../domains/crm/ports/crmMessagingGateway.js";
import { createTestCrmConnectionRepository } from "../../../domains/crm/testSupportConnections.js";
import type { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import type { createMemoryCrmWebhookEventRepository } from "../adapters/memory/crmWebhookEventRepository.js";
import type { expect } from "vitest";
import { createTestApp } from "./crm.controller.testSupport.js";
import {
  connectionId,
  createOlxConnection,
  olxSecurity,
  olxWebhookSecret,
  storeId,
  tenantId,
} from "./crm.olxChat.testSupport.js";

export function validOlxLeadPayload() {
  return {
    createdAt: "2026-08-10T12:00:00.000Z",
    email: "ana@example.com",
    linkAd: "https://www.olx.com.br/vi/123",
    listId: "123",
    message: "Tenho interesse",
    name: "Ana",
    source: "chat",
  };
}

export function fullOlxLeadPayload() {
  return {
    ...validOlxLeadPayload(),
    adsInfo: { body: "not retained", subject: "Honda Civic" },
    buyerHistory: { buyer: { email: "extra@example.com" } },
    externalId: "lead-1",
    phone: "11999999999",
  };
}

export async function readOlxLeadResponse(response: Response) {
  return (await response.json()) as {
    responseId: string;
    status: "accepted" | "duplicate";
  };
}

export function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

export function expectSealedOlxLeadReceipt(
  expectValue: typeof expect,
  payload: Record<string, unknown> | undefined,
) {
  expectValue(payload).toBeDefined();
  expectValue(payload?.schemaVersion).toBe(2);
  expectValue(typeof payload?.identityKey).toBe("string");
  expectValue(payload?.identityKey).toMatch(/^[a-f0-9]{64}$/);
  expectValue(typeof payload?.sealedReceipt).toBe("string");
}

export function createOlxLeadsTestApp(options: {
  crmConnectionRepository?: ReturnType<
    typeof createTestCrmConnectionRepository
  >;
  crmRepository?: ReturnType<typeof createMemoryCrmRepository>;
  crmWebhookEventRepository?: ReturnType<
    typeof createMemoryCrmWebhookEventRepository
  >;
  sendText?: CrmMessagingGateway["sendText"];
}) {
  return createTestApp({
    crmConnectionRepository:
      options.crmConnectionRepository ??
      createTestCrmConnectionRepository([createOlxConnection()]),
    crmOlxWebhookSecurity: olxSecurity(),
    ...(options.crmRepository ? { crmRepository: options.crmRepository } : {}),
    ...(options.crmWebhookEventRepository
      ? { crmWebhookEventRepository: options.crmWebhookEventRepository }
      : {}),
    ...(options.sendText
      ? { crmMessagingGateway: { sendText: options.sendText } }
      : {}),
    entitlements: ["crm"],
    olxChatEnabled: true,
  });
}

export function postOlxLead(
  app: ReturnType<typeof createTestApp>,
  payload: Record<string, unknown>,
  auth: "header" | "query" = "header",
  secret = olxWebhookSecret,
) {
  const query = auth === "query" ? `?token=${secret}` : "";
  return app.request(`/api/v1/crm/webhooks/olx/${connectionId}/leads${query}`, {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
      ...(auth === "header" ? { "x-olx-webhook-secret": secret } : {}),
    },
    method: "POST",
  });
}

export function listOlxTestLeads(
  repository: ReturnType<typeof createMemoryCrmRepository>,
) {
  return repository.listLeads({ limit: 20, storeId, tenantId });
}
