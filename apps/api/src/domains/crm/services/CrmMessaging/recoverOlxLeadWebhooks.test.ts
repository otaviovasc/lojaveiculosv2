import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { AuditEvent } from "../../../../shared/auditSink.js";
import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import {
  buildOlxLeadProviderReference,
  createOlxLeadReceiptPayload,
  olxLeadReceiptEventType,
  sealOlxLeadReceiptPayload,
} from "../../messaging/olxLeadReceipt.js";
import {
  createOlxLeadRecoveryTestRepository,
  createOlxLeadRecoveryTestWebhookRepository,
} from "../../testSupportOlxLeadRecovery.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import type { CrmConnectionCredentialVault } from "../../ports/crmConnectionSetupProvider.js";
import { recoverOlxLeadWebhooks } from "./recoverOlxLeadWebhooks.js";

const connectionId = "24000000-0000-4000-8000-000000000101";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const vault = createTestVault();

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
      crmConnectionCredentialVault: vault,
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
      crmConnectionCredentialVault: vault,
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
    const processedFixture = {
      errorMessage: null,
      payload: {
        schemaVersion: 3,
      },
      status: "processed",
    } as const;
    expect(processed).toMatchObject(processedFixture);
    expect(typeof processed?.payload.identityKey).toBe("string");
    expect(typeof processed?.payload.receiptClearedAt).toBe("string");
    expect(processed?.payload).not.toHaveProperty("sealedReceipt");
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
  const sealed = await sealOlxLeadReceiptPayload(
    vault,
    { connectionId, storeId, tenantId },
    payload,
  );
  expect(JSON.stringify(sealed)).not.toContain("ana@example.com");
  expect(JSON.stringify(sealed)).not.toContain("Tenho interesse");
  return repository.recordReceived({
    connectionId,
    environment: "test",
    eventType: olxLeadReceiptEventType,
    payload: sealed,
    provider: "olx_chat",
    providerEventId: buildOlxLeadProviderReference(payload.identityKey),
    storeId,
    tenantId,
  });
}

function createTestVault(): CrmConnectionCredentialVault {
  return {
    async open(input) {
      return Buffer.from(input.sealed, "base64url").toString("utf8");
    },
    async seal(input) {
      return Buffer.from(input.plaintext, "utf8").toString("base64url");
    },
  };
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
