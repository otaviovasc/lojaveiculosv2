import { describe, expect, it } from "vitest";
import { createMemoryAuditSink } from "../../../shared/auditSink.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createMemorySalesRepository } from "../adapters/memory/salesRepository.js";
import { closeSale } from "./salesReversion.testSupport.js";
import {
  context,
  createHarness,
} from "./salesWorkflowTransition.testSupport.js";

describe("sale reversion workflow", () => {
  it("audits rejected reversion attempts as required critical events", async () => {
    const audit = createMemoryAuditSink();
    const { services } = createHarness("reserved");

    await expect(
      services.revert(auditedContext(audit), {
        reason: "   ",
        saleId: "missing-sale",
      }),
    ).rejects.toThrow("nonblank reason");
    expect(audit.events).toEqual([
      expect.objectContaining({
        action: "sale.revert.rejected",
        criticality: "critical",
        failureTier: "required",
        outcome: "failed",
      }),
    ]);
  });

  it("audits denied reversion attempts without reading sale state", async () => {
    const audit = createMemoryAuditSink();
    const { services } = createHarness("reserved");

    await expect(
      services.revert(auditedContext(audit, []), {
        reason: "Unauthorized correction",
        saleId: "sale-secret",
      }),
    ).rejects.toThrow("Missing permission: sale.correct");
    expect(audit.events).toEqual([
      expect.objectContaining({
        action: "sale.revert.rejected",
        outcome: "denied",
      }),
    ]);
  });

  it("rejects non-user actors even when they hold the correction permission", async () => {
    const audit = createMemoryAuditSink();
    const { services } = createHarness("reserved");
    const integrationContext = auditedContext(audit);
    integrationContext.actor = { id: "integration_1", kind: "integration" };

    await expect(
      services.revert(integrationContext, {
        reason: "Automated correction",
        saleId: "sale-secret",
      }),
    ).rejects.toThrow("authenticated store user actor");
    expect(audit.events).toEqual([
      expect.objectContaining({
        action: "sale.revert.rejected",
        outcome: "denied",
      }),
    ]);
  });

  it("rejects direct edits to closed sales", async () => {
    const { services } = createHarness("reserved");
    const original = await closeSale(services);

    await expect(
      services.updateDraft(context(["sale.correct"]), original.id, {
        buyerSnapshot: { name: "Mutated buyer" },
      }),
    ).rejects.toMatchObject({ currentStatus: "closed" });
    const revisions = await services.list(context(["sale.read"]), {
      limit: 10,
      offset: 0,
      status: "all",
    });
    expect(
      revisions.find((sale) => sale.id === original.id)?.buyerSnapshot,
    ).toEqual(original.buyerSnapshot);
  });

  it("preserves the closed revision and creates a compensated draft correction", async () => {
    const { services, vehiclePorts } = createHarness("reserved");
    const original = await closeSale(services);

    const correction = await services.revert(context(["sale.correct"]), {
      reason: "Buyer legal name requires correction",
      saleId: original.id,
    });

    expect(correction).toMatchObject({
      correctionOfSaleId: original.id,
      isCurrentRevision: true,
      overrideReason: "Buyer legal name requires correction",
      revision: 2,
      status: "draft",
    });
    expect(correction.id).not.toBe(original.id);
    expect(correction.payments[0]).toMatchObject({
      paidAt: null,
      providerPaymentId: null,
      status: "pending",
    });
    expect(correction.payments[0]?.id).not.toBe(original.payments[0]?.id);

    const revisions = await services.list(context(["sale.read"]), {
      limit: 10,
      offset: 0,
      status: "all",
    });
    expect(revisions.find((sale) => sale.id === original.id)).toMatchObject({
      isCurrentRevision: false,
      revision: 1,
      status: "closed",
    });
    expect(vehiclePorts.units.get("unit_1")?.status).toBe("available");
    expect(vehiclePorts.listings.get("listing_1")?.status).toBe("published");
    const voidedDocument = [...vehiclePorts.documents.values()].find(
      (document) => document.status === "voided",
    );
    if (!voidedDocument) throw new Error("Expected a voided sale document.");
    const operationHistory = voidedDocument.metadata.operationHistory;
    if (!Array.isArray(operationHistory)) {
      throw new Error("Expected document operation history.");
    }
    expect(
      operationHistory.some(
        (operation: unknown) =>
          isRecord(operation) &&
          operation.action === "voided" &&
          operation.actorId === "user_1" &&
          operation.reason === "Buyer legal name requires correction",
      ),
    ).toBe(true);
    const reversedEntry = vehiclePorts.financeRepository.entries[0];
    expect(reversedEntry?.status).toBe("cancelled");
    expect(reversedEntry?.metadata).toMatchObject({
      revertedBySaleCorrection: true,
      revertedSaleId: original.id,
    });
  });

  it("does not reactivate cancelled allocations in the correction revision", async () => {
    const repository = createMemorySalesRepository();
    const { services } = createHarness("reserved", repository);
    const original = await closeSale(services);
    const activePayment = original.payments[0];
    if (!activePayment) throw new Error("Expected closed sale payment.");
    await repository.updateDraft(
      { storeId: "store_1", tenantId: "tenant_1" },
      original.id,
      {
        payments: [
          { ...activePayment },
          {
            amountCents: 50000,
            method: "cash",
            principalCents: 50000,
            status: "cancelled",
          },
        ],
      },
    );

    const correction = await services.revert(context(["sale.correct"]), {
      reason: "Remove cancelled allocation from the correction",
      saleId: original.id,
    });

    expect(correction.payments).toHaveLength(1);
    expect(correction.payments[0]).toMatchObject({
      method: activePayment.method,
      status: "pending",
    });
  });

  it("fails closed for trade-in acquisition snapshots", async () => {
    const repository = createMemorySalesRepository();
    const { services, vehiclePorts } = createHarness("reserved", repository);
    const original = await closeSale(services);
    await repository.updateDraft(
      { storeId: "store_1", tenantId: "tenant_1" },
      original.id,
      {
        saleSourceSnapshot: {
          tradeIn: { enabled: true, model: "Civic", plate: "TRD1E23" },
        },
      },
    );

    await expect(
      services.revert(context(["sale.correct"]), {
        reason: "Correction requested",
        saleId: original.id,
      }),
    ).rejects.toMatchObject({
      unsupportedReason: "trade_in_acquisition",
    });
    expect(vehiclePorts.units.get("unit_1")?.status).toBe("sold");
    expect(vehiclePorts.financeRepository.entries[0]?.status).toBe("paid");
  });

  it("does not compensate when generated document ownership is ambiguous", async () => {
    const { services, vehiclePorts } = createHarness("reserved");
    const original = await closeSale(services);
    const firstDocument = [...vehiclePorts.documents.values()][0];
    if (!firstDocument) throw new Error("Expected generated sale document.");
    vehiclePorts.documents.set(firstDocument.id, {
      ...firstDocument,
      metadata: { saleId: original.id },
    });

    await expect(
      services.revert(context(["sale.correct"]), {
        reason: "Correction requested",
        saleId: original.id,
      }),
    ).rejects.toMatchObject({ compensation: "documents" });
    expect(vehiclePorts.units.get("unit_1")?.status).toBe("sold");
    expect(vehiclePorts.financeRepository.entries[0]?.status).toBe("paid");
  });
});

function auditedContext(
  audit: ReturnType<typeof createMemoryAuditSink>,
  permissions: string[] = ["sale.correct"],
) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    audit,
    permissions,
    request: { requestId: "req_revert" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
