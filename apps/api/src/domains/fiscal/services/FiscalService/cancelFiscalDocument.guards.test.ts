import { describe, expect, it, vi } from "vitest";
import {
  createServiceContext,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import { FiscalDocumentCancellationNotAllowedError } from "../../domain/fiscalErrors.js";
import type { FiscalDocumentStatus } from "../../ports/fiscalRepository.js";
import { createFiscalTestPorts } from "../../testSupport.js";
import { cancelFiscalDocument } from "./cancelFiscalDocument.js";

const nonCancellableStatuses: FiscalDocumentStatus[] = [
  "cancelled",
  "draft",
  "error",
  "failed",
  "processing",
  "queued",
  "rejected",
];

describe("cancelFiscalDocument guards", () => {
  it.each(nonCancellableStatuses)(
    "does not call the provider when persisted status is %s",
    async (status) => {
      const harness = await createHarness(status);

      await expect(runCancel(harness)).rejects.toBeInstanceOf(
        FiscalDocumentCancellationNotAllowedError,
      );

      expect(harness.cancelDocument).not.toHaveBeenCalled();
      expect(harness.updateDocumentStatus).not.toHaveBeenCalled();
      expect(harness.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "fiscal.document.cancel_attempt",
          outcome: "failed",
        }),
      );
    },
  );

  it("audits an unknown provider outcome without persisting synthetic cancellation", async () => {
    const harness = await createHarness("issued");
    harness.cancelDocument.mockRejectedValueOnce(new Error("provider timeout"));

    await expect(runCancel(harness)).rejects.toThrow("provider timeout");

    expect(harness.updateDocumentStatus).not.toHaveBeenCalled();
    expect(harness.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "fiscal.document.cancel",
        metadata: {
          errorName: "Error",
          providerOutcome: "unknown",
        },
        outcome: "failed",
      }),
    );
  });
});

async function createHarness(status: FiscalDocumentStatus) {
  const ports = createFiscalTestPorts();
  const document = await ports.fiscalRepository.createDocument({
    documentKind: "nfe",
    documentType: "nfe_vehicle_sale",
    providerDocumentId: "provider_document_1",
    status,
    storeId: "store_1",
    tenantId: "tenant_1",
  });
  const record = vi.fn(async () => undefined);
  return {
    cancelDocument: vi.spyOn(ports.fiscalProviderGateway, "cancelDocument"),
    document,
    ports,
    record,
    updateDocumentStatus: vi.spyOn(
      ports.fiscalRepository,
      "updateDocumentStatus",
    ),
  };
}

function runCancel(harness: Awaited<ReturnType<typeof createHarness>>) {
  return cancelFiscalDocument(
    context(harness.record),
    {
      documentId: harness.document.id,
      reason: "Customer requested cancellation",
    },
    harness.ports,
  );
}

function context(record: ServiceContext["audit"]["record"]) {
  return Object.assign(
    createServiceContext({
      actor: { id: "user_1", kind: "user" },
      audit: { record },
      permissions: ["fiscal.document.cancel", "fiscal.manage"],
      request: { requestId: "request_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    { entitlements: ["fiscal"] },
  );
}
