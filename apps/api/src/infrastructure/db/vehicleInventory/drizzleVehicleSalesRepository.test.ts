import { describe, expect, it } from "vitest";
import { vehicleSaleDocumentKinds } from "../../../domains/vehicle/documents/vehicleWorkflowDocuments.js";
import type { CreateVehicleSaleInput } from "../../../domains/vehicle/ports/vehicleSalesRepository.js";
import { createListing } from "../../../domains/vehicle/services/VehicleService/testSupport.js";
import { toInsertVehicleWorkflowSale } from "./drizzleVehicleSalesRepository.js";

describe("vehicle workflow sale persistence", () => {
  it("persists the document selection used by a direct vehicle workflow", () => {
    const input: CreateVehicleSaleInput = {
      buyerSnapshot: {
        address: null,
        document: null,
        email: null,
        name: "Buyer Example",
        phone: null,
      },
      listing: createListing({ status: "published" }),
      payments: [],
      salePriceCents: 9500000,
      selectedDocumentKinds: vehicleSaleDocumentKinds,
      sellerUserId: "seller_1",
      status: "closed",
      unit: {
        colorName: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        id: "unit_1",
        listingId: "listing_1",
        plate: "ABC1D23",
        status: "available",
        stockNumber: null,
        storeId: "store_1",
        tenantId: "tenant_1",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        vin: null,
      },
    };

    expect(toInsertVehicleWorkflowSale(input).selectedDocumentKinds).toEqual(
      vehicleSaleDocumentKinds,
    );
  });
});
