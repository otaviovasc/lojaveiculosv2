import { describe, expect, it } from "vitest";
import { attachVehicleUnit } from "./attachVehicleUnit.js";
import { reserveVehicleListing } from "./reserveVehicleListing.js";
import { sellVehicleListing } from "./sellVehicleListing.js";
import {
  createContext,
  createInMemoryVehiclePorts,
  createListing,
} from "./testSupport.js";

describe("VehicleService workflow documents", () => {
  it("reserves a vehicle and emits the signal receipt document", async () => {
    const context = createContext(["inventory.create", "inventory.reserve"]);
    const ports = createInMemoryVehiclePorts([
      createListing({ status: "available", unitIds: ["unit_1"] }),
    ]);
    await attachVehicleUnit(context, { listingId: "listing_1" }, ports);

    const listing = await reserveVehicleListing(
      context,
      {
        buyer: buyer(),
        listingId: "listing_1",
        paymentMethod: "pix",
        signalAmountCents: 100000,
        unitId: "unit_1",
      },
      ports,
    );

    expect(listing.status).toBe("reserved");
    expect(ports.units.get("unit_1")?.status).toBe("reserved");
    const operationsRepository = ports.operationsRepository;
    if (!operationsRepository) throw new Error("Expected operations port.");
    await expect(
      operationsRepository.listStatusHistoryByListing({
        listingId: "listing_1",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        fromStatus: "available",
        target: "listing",
        toStatus: "reserved",
      }),
      expect.objectContaining({
        fromStatus: "available",
        target: "unit",
        toStatus: "reserved",
        unitId: "unit_1",
      }),
    ]);
    const [document] = [...ports.documents.values()];
    expect(document).toMatchObject({
      fileName: "reservation_receipt-listing_1.pdf",
      kind: "reservation_receipt",
      linkRole: "reservation_receipt",
      mimeType: "application/pdf",
      status: "issued",
    });
    expect(document?.metadata.documentType).toBe("recibo_de_sinal");
    expect(ports.financeRepository.entries).toEqual([
      expect.objectContaining({
        amountCents: 100000,
        category: "vehicle_reservation_signal",
        status: "pending",
        type: "revenue",
      }),
    ]);
    expect(
      ports.financeRepository.links.map((link) => link.targetType),
    ).toEqual(["sale", "sale_payment", "vehicle_listing", "vehicle_unit"]);
    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "vehicle_listing.reserve" }),
    );
  });

  it("sells a vehicle and emits the four sale documents", async () => {
    const context = createContext(["inventory.create", "inventory.sell"]);
    const ports = createInMemoryVehiclePorts([
      createListing({ status: "reserved", unitIds: ["unit_1"] }),
    ]);
    await attachVehicleUnit(context, { listingId: "listing_1" }, ports);

    const listing = await sellVehicleListing(
      context,
      {
        buyer: buyer(),
        listingId: "listing_1",
        paymentMethod: "pix",
        unitId: "unit_1",
      },
      ports,
    );

    expect(listing.status).toBe("sold");
    expect(ports.units.get("unit_1")?.status).toBe("sold");
    const operationsRepository = ports.operationsRepository;
    if (!operationsRepository) throw new Error("Expected operations port.");
    await expect(
      operationsRepository.listStatusHistoryByListing({
        listingId: "listing_1",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        fromStatus: "reserved",
        target: "listing",
        toStatus: "sold",
      }),
      expect.objectContaining({
        fromStatus: "available",
        target: "unit",
        toStatus: "sold",
        unitId: "unit_1",
      }),
    ]);
    expect(
      [...ports.documents.values()].map((document) => document.kind),
    ).toEqual([
      "sale_contract",
      "sale_receipt",
      "delivery_term",
      "power_of_attorney",
    ]);
    expect(ports.financeRepository.entries).toEqual([
      expect.objectContaining({
        amountCents: 9500000,
        category: "vehicle_sale",
        status: "paid",
        type: "revenue",
      }),
    ]);
    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "vehicle_listing.sell" }),
    );
  });

  it("does not allow public actors to reserve or sell inventory", async () => {
    const context = {
      ...createContext(["inventory.reserve", "inventory.sell"]),
      actor: { id: "public", kind: "public" as const },
    };
    const ports = createInMemoryVehiclePorts([
      createListing({ status: "available", unitIds: ["unit_1"] }),
    ]);
    await attachVehicleUnit(
      createContext(["inventory.create"]),
      { listingId: "listing_1" },
      ports,
    );

    await expect(
      reserveVehicleListing(
        context,
        {
          buyer: buyer(),
          listingId: "listing_1",
          paymentMethod: "pix",
          signalAmountCents: 100000,
          unitId: "unit_1",
        },
        ports,
      ),
    ).rejects.toThrow(
      "Vehicle workflow requires authenticated store user actor.",
    );

    await expect(
      sellVehicleListing(
        context,
        {
          buyer: buyer(),
          listingId: "listing_1",
          paymentMethod: "pix",
          unitId: "unit_1",
        },
        ports,
      ),
    ).rejects.toThrow(
      "Vehicle workflow requires authenticated store user actor.",
    );
  });

  it("rejects workflow transitions from terminal listing states", async () => {
    const context = createContext(["inventory.create", "inventory.reserve"]);
    const ports = createInMemoryVehiclePorts([
      createListing({ status: "sold", unitIds: ["unit_1"] }),
    ]);
    await attachVehicleUnit(context, { listingId: "listing_1" }, ports);

    await expect(
      reserveVehicleListing(
        context,
        {
          buyer: buyer(),
          listingId: "listing_1",
          paymentMethod: "pix",
          signalAmountCents: 100000,
          unitId: "unit_1",
        },
        ports,
      ),
    ).rejects.toThrow("must be available to reserve");

    expect(ports.documents.size).toBe(0);
    expect(ports.financeRepository.entries).toEqual([]);
  });
});

function buyer() {
  return {
    address: "Rua Um, 100",
    document: "000.000.000-00",
    email: "buyer@example.com",
    name: "Buyer Example",
    phone: "(11) 99999-0000",
  };
}
