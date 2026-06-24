import { describe, expect, it } from "vitest";
import { attachVehicleDocument } from "./attachVehicleDocument.js";
import { attachVehicleUnit } from "./attachVehicleUnit.js";
import {
  createContext,
  createInMemoryVehiclePorts,
  createListing,
} from "./testSupport.js";

describe("Vehicle document service", () => {
  it("stores manual unit document metadata for centralized folders", async () => {
    const context = createContext([
      "inventory.create",
      "inventory.document_attach",
    ]);
    const ports = createInMemoryVehiclePorts([
      createListing({ title: "Fiat Toro Volcano" }),
    ]);
    const unit = await attachVehicleUnit(
      context,
      {
        listingId: "listing_1",
        plate: "ABC1D23",
        stockNumber: "STK-1",
        vin: "9BWZZZ",
      },
      ports,
    );

    const document = await attachVehicleDocument(
      context,
      {
        fileName: "registration.pdf",
        kind: "vehicle_registration",
        listingId: "listing_1",
        storageKey:
          "tenants/tenant_1/stores/store_1/listings/listing_1/documents/registration.pdf",
        targetId: unit.id,
        targetType: "vehicle_unit",
        title: "CRLV",
      },
      ports,
    );

    expect(document).toMatchObject({
      targetId: unit.id,
      targetType: "vehicle_unit",
    });
    expect(document.metadata).toMatchObject({
      manualUpload: true,
      vehicle: {
        listingId: "listing_1",
        plate: "ABC1D23",
        stockNumber: "STK-1",
        title: "Fiat Toro Volcano",
        unitId: unit.id,
        vin: "9BWZZZ",
      },
    });
  });
});
