import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { AuditEvent } from "../../../../shared/auditSink.js";
import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import {
  buildOlxLeadProviderReference,
  createOlxLeadReceiptPayload,
  olxLeadReceiptEventType,
} from "../../messaging/olxLeadReceipt.js";
import {
  createOlxLeadRecoveryTestRepository,
  createOlxLeadRecoveryTestWebhookRepository,
} from "../../testSupportOlxLeadRecovery.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { recoverOlxLeadWebhooks } from "./recoverOlxLeadWebhooks.js";

const connectionId = "24000000-0000-4000-8000-000000000101";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("recoverOlxLeadWebhooks", () => {
  it("allows only one concurrent worker to process a receipt", async () => {
    const started = deferred<void>();
    const release = deferred<void>();
    const crm = createOlxLeadRecoveryTestRepository({
      beforeCreateLead: async () => {
        started.resolve();
        await release.promise;
      },
    });
    const webhookRepository = createOlxLeadRecoveryTestWebhookRepository();
    await recordReceipt(webhookRepository);
    const ports = {
      crmRepository: crm.repository,
      crmWebhookEventRepository: webhookRepository,
    } as CrmServicePorts;

    const first = recoverOlxLeadWebhooks(
      context("worker-1"),
      { limit: 1 },
      ports,
    );
    await started.promise;
    const second = await recoverOlxLeadWebhooks(
      context("worker-2"),
      { limit: 1 },
      ports,
    );
    release.resolve();

    expect(second).toEqual({ claimed: 0, failed: 0, processed: 0 });
    expect(await first).toEqual({ claimed: 1, failed: 0, processed: 1 });
    expect(crm.createLeadCalls()).toBe(1);
  });

  it("recovers after post-write audit failure without duplicating the lead", async () => {
    const crm = createOlxLeadRecoveryTestRepository({});
    const webhookRepository = createOlxLeadRecoveryTestWebhookRepository();
    await recordReceipt(webhookRepository);
    const ports = {
      crmRepository: crm.repository,
      crmWebhookEventRepository: webhookRepository,
    } as CrmServicePorts;
    const auditStarted = deferred<void>();
    const auditFailure = deferred<void>();
    let auditCalls = 0;
    const firstContext = context("worker-fails", async () => {
      auditCalls += 1;
      if (auditCalls > 1) return;
      auditStarted.resolve();
      return auditFailure.promise;
    });

    const first = recoverOlxLeadWebhooks(firstContext, { limit: 1 }, ports);
    await auditStarted.promise;
    auditFailure.reject(new Error("audit unavailable"));

    expect(await first).toEqual({ claimed: 1, failed: 1, processed: 0 });
    expect(crm.leads).toHaveLength(1);
    const [failed] = await webhookRepository.list({
      limit: 10,
      storeId,
      tenantId,
    });
    expect(failed?.status).toBe("failed");
    expect(typeof failed?.errorMessage).toBe("string");

    expect(
      await recoverOlxLeadWebhooks(
        context("worker-recovers"),
        { limit: 1 },
        ports,
      ),
    ).toEqual({ claimed: 1, failed: 0, processed: 1 });
    expect(crm.leads).toHaveLength(1);
    const [processed] = await webhookRepository.list({
      limit: 10,
      storeId,
      tenantId,
    });
    expect(processed).toMatchObject({
      errorMessage: null,
      status: "processed",
    });
  });
});

async function recordReceipt(
  repository: ReturnType<typeof createOlxLeadRecoveryTestWebhookRepository>,
) {
  const payload = createOlxLeadReceiptPayload(connectionId, {
    adId: "ad-1",
    adsInfo: { subject: "Honda Civic" },
    buyerEmail: "ana@example.com",
    buyerName: "Ana",
    buyerPhone: null,
    createdAt: new Date("2026-08-10T12:00:00.000Z"),
    externalId: "olx-lead-1",
    linkAd: "https://www.olx.com.br/vi/123",
    listId: "123",
    message: "Tenho interesse",
    source: "chat",
  });
  return repository.recordReceived({
    connectionId,
    environment: "test",
    eventType: olxLeadReceiptEventType,
    payload,
    provider: "olx_chat",
    providerEventId: buildOlxLeadProviderReference(payload.identityKey),
    storeId,
    tenantId,
  });
}

function context(
  id: string,
  record: (event: AuditEvent) => Promise<void> = async () => undefined,
) {
  return createServiceContext({
    actor: { id, kind: "system" },
    audit: { record },
    auditFailureTier: "required",
    permissions: ["crm.whatsapp.ingest"],
    request: { requestId: id },
  });
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}
