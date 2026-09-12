import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import type { VehicleChecklistOverview } from "../readModels/vehicleChecklistOverview.js";
import { renderVehicleChecklistReportPdf } from "./vehicleChecklistReportPdf.js";

const branding = {
  address: null,
  city: "Campinas",
  contactLine: "(11) 99999-9999",
  document: "12.345.678/0001-90",
  email: null,
  logoUrl: null,
  name: "Loja Teste",
  phone: null,
  state: "SP",
};

const overview: VehicleChecklistOverview = {
  generatedAt: new Date("2026-07-15T12:00:00.000Z"),
  items: [
    {
      checklists: [
        {
          completedAt: null,
          completedByUserId: null,
          createdAt: new Date("2026-07-15T10:00:00.000Z"),
          id: "checklist_1",
          items: [
            {
              id: "item_1",
              label: "Manual",
              notes: null,
              status: "passed",
            },
            {
              id: "item_2",
              label: "CRV",
              notes: "Aguardando assinatura do antigo proprietário.",
              status: "pending",
            },
          ],
          name: "Inspeção e Documentação",
          status: "in_progress",
          storeId: "store_1",
          tenantId: "tenant_1",
          unitId: "unit_1",
          updatedAt: new Date("2026-07-15T11:00:00.000Z"),
        },
      ],
      listing: {
        id: "listing_1",
        manufactureYear: 2024,
        modelYear: 2025,
        status: "published",
        title: "Fiat Toro Volcano",
      },
      metrics: {
        checklistCount: 1,
        failedItemCount: 1,
        itemCount: 2,
        pendingItemCount: 1,
        progressPercent: 50,
        resolvedItemCount: 1,
        waivedItemCount: 0,
      },
      status: "failed",
      unit: {
        colorName: "Branco",
        id: "unit_1",
        plate: "ABC1D23",
        status: "available",
        stockNumber: "42",
        vin: null,
      },
      updatedAt: new Date("2026-07-15T11:00:00.000Z"),
    },
  ],
  summary: {
    attentionUnitCount: 1,
    checklistCount: 1,
    failedItemCount: 1,
    itemCount: 2,
    missingChecklistUnitCount: 0,
    pendingItemCount: 1,
    progressPercent: 50,
    resolvedItemCount: 1,
    unitCount: 1,
    waivedItemCount: 0,
  },
};

describe("vehicle checklist PDF", () => {
  it("renders the V1-style unit report from the overview read model", async () => {
    const bytes = await renderVehicleChecklistReportPdf({
      branding,
      overview,
      scopeLabel: "Estoque ativo",
      unitReport: true,
    });

    expect(new TextDecoder().decode(bytes.slice(0, 8))).toContain("%PDF");
    expect(bytes.byteLength).toBeGreaterThan(1_000);
    const document = await PDFDocument.load(bytes);
    expect(document.getTitle()).toBe("Checklist do Veículo");
    expect(document.getAuthor()).toBe("Loja Teste");
  });

  it("renders the A4-landscape fleet summary report", async () => {
    const bytes = await renderVehicleChecklistReportPdf({
      branding,
      overview,
      scopeLabel: "Estoque ativo",
      unitReport: false,
    });

    expect(new TextDecoder().decode(bytes.slice(0, 8))).toContain("%PDF");
    expect(bytes.byteLength).toBeGreaterThan(1_000);
    const document = await PDFDocument.load(bytes);
    expect(document.getTitle()).toBe("Resumo Geral de Checklists");
    const [page] = document.getPages();
    expect(page?.getWidth()).toBeGreaterThan(page?.getHeight() ?? 0);
  });
});
