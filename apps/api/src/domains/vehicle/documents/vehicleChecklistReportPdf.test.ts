import { describe, expect, it } from "vitest";
import { renderVehicleChecklistReportPdf } from "./vehicleChecklistReportPdf.js";

describe("vehicle checklist PDF", () => {
  it("renders a branded A4 document from the overview read model", async () => {
    const bytes = await renderVehicleChecklistReportPdf({
      branding: {
        address: null,
        contactLine: "(11) 99999-9999",
        document: "12.345.678/0001-90",
        email: null,
        name: "Loja Teste",
        phone: null,
      },
      overview: {
        generatedAt: new Date("2026-07-15T12:00:00.000Z"),
        items: [
          {
            checklists: [],
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
              progressPercent: 0,
              resolvedItemCount: 0,
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
          progressPercent: 0,
          resolvedItemCount: 0,
          unitCount: 1,
          waivedItemCount: 0,
        },
      },
      scopeLabel: "Estoque ativo",
      unitReport: false,
    });

    expect(new TextDecoder().decode(bytes.slice(0, 8))).toContain("%PDF");
    expect(bytes.byteLength).toBeGreaterThan(1_000);
  });
});
