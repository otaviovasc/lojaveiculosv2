import { describe, expect, it, vi } from "vitest";
import type { CrmSaleOutcomePort } from "../../../domains/sales/ports/crmSaleOutcomePort.js";
import { createMemorySalesRepository } from "../adapters/memory/salesRepository.js";
import {
  completeDraft,
  context,
  createHarness,
} from "./salesWorkflowTransition.testSupport.js";

describe("sales workflow CRM outcome", () => {
  it("does not apply a CRM outcome while a sale remains a draft", async () => {
    const crmSaleOutcomePort = crmOutcomePort();
    const { services } = createHarness(
      "available",
      createMemorySalesRepository(),
      undefined,
      crmSaleOutcomePort,
    );
    const draft = await services.createDraft(
      context(["sale.draft"]),
      completeDraft(),
    );
    await services.updateDraft(context(["sale.draft"]), draft.id, {
      sellerUserId: "seller_2",
    });

    expect(crmSaleOutcomePort.applyWon).not.toHaveBeenCalled();
  });

  it("applies the authoritative CRM Won outcome after closing a linked sale", async () => {
    const crmSaleOutcomePort = crmOutcomePort();
    const { services, vehiclePorts } = createHarness(
      "reserved",
      createMemorySalesRepository(),
      undefined,
      crmSaleOutcomePort,
    );
    vi.mocked(crmSaleOutcomePort.applyWon).mockImplementation(async () => {
      expect(vehiclePorts.units.get("unit_1")?.status).toBe("sold");
      expect(vehiclePorts.documents.size).toBeGreaterThan(0);
    });
    const serviceContext = context(["sale.close", "sale.draft"]);
    const draft = await services.createDraft(serviceContext, closeReadyDraft());

    await services.transition(serviceContext, {
      saleId: draft.id,
      status: "closed",
    });

    expect(crmSaleOutcomePort.applyWon).toHaveBeenCalledOnce();
    expect(crmSaleOutcomePort.applyWon).toHaveBeenCalledWith(serviceContext, {
      commandId: `sale:${draft.id}:crm-won`,
      leadId: "lead_1",
      saleId: draft.id,
    });
  });

  it("propagates CRM Won failure after completing the canonical sale workflow", async () => {
    const outcomeError = new Error("CRM Won outcome failed");
    const crmSaleOutcomePort = crmOutcomePort(outcomeError);
    const { services, vehiclePorts } = createHarness(
      "reserved",
      createMemorySalesRepository(),
      undefined,
      crmSaleOutcomePort,
    );
    const draft = await services.createDraft(
      context(["sale.draft"]),
      closeReadyDraft(),
    );

    await expect(
      services.transition(context(["sale.close"]), {
        saleId: draft.id,
        status: "closed",
      }),
    ).rejects.toThrow(outcomeError);

    expect(crmSaleOutcomePort.applyWon).toHaveBeenCalledOnce();
    expect(vehiclePorts.units.get("unit_1")?.status).toBe("sold");
    expect(vehiclePorts.documents.size).toBeGreaterThan(0);
  });

  it("does not apply CRM Won when the canonical sale workflow fails", async () => {
    const crmSaleOutcomePort = crmOutcomePort();
    const { services } = createHarness(
      "reserved",
      createMemorySalesRepository(),
      undefined,
      crmSaleOutcomePort,
    );
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...closeReadyDraft(),
      selectedDocumentKinds: ["unsupported_document"],
    });

    await expect(
      services.transition(context(["sale.close"]), {
        saleId: draft.id,
        status: "closed",
      }),
    ).rejects.toThrow("selected_document_kinds");

    expect(crmSaleOutcomePort.applyWon).not.toHaveBeenCalled();
  });

  it("fails a lead-backed closure when CRM outcome integration is unavailable", async () => {
    const { services } = createHarness(
      "reserved",
      createMemorySalesRepository(),
      undefined,
      null,
    );
    const draft = await services.createDraft(
      context(["sale.draft"]),
      closeReadyDraft(),
    );

    await expect(
      services.transition(context(["sale.close"]), {
        saleId: draft.id,
        status: "closed",
      }),
    ).rejects.toThrow("CRM sale outcome integration is unavailable");
  });

  it("closes a sale without a lead without invoking CRM", async () => {
    const crmSaleOutcomePort = crmOutcomePort();
    const { services } = createHarness(
      "reserved",
      createMemorySalesRepository(),
      undefined,
      crmSaleOutcomePort,
    );
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...closeReadyDraft(),
      leadId: null,
    });

    const closed = await services.transition(
      context(["sale.close", "sale.override_required_fields"]),
      {
        overrideReason: "Sale originated without a CRM lead",
        overrideRequiredFields: true,
        saleId: draft.id,
        status: "closed",
      },
    );

    expect(closed.status).toBe("closed");
    expect(crmSaleOutcomePort.applyWon).not.toHaveBeenCalled();
  });
});

function crmOutcomePort(error?: Error): CrmSaleOutcomePort {
  return {
    applyWon: vi.fn(async () => {
      if (error) throw error;
    }),
  };
}

function closeReadyDraft() {
  return {
    ...completeDraft(),
    payments: [
      {
        amountCents: 5000000,
        dueAt: new Date("2026-07-14T12:00:00.000Z"),
        method: "pix" as const,
        principalCents: 5000000,
      },
    ],
  };
}
