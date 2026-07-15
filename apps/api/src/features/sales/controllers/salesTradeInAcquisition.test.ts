import { describe, expect, it } from "vitest";
import {
  completeDraft,
  context,
  createHarness,
} from "./salesWorkflowTransition.testSupport.js";

describe("sales trade-in acquisition", () => {
  it("auto-registers a trade-in vehicle when the sale closes", async () => {
    const { services, vehiclePorts } = createHarness("reserved");
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...completeDraft(),
      payments: [
        {
          amountCents: 5000000,
          dueAt: new Date("2026-07-14T12:00:00.000Z"),
          method: "pix",
          principalCents: 5000000,
        },
      ],
      saleSourceSnapshot: {
        tradeIn: {
          catalog: {
            brandCode: "21",
            brandName: "Honda",
            fipeCode: "014102-8",
            modelCode: "10234",
            modelName: "Civic Touring 1.5 Turbo",
            modelYear: 2022,
            source: "fipe",
            vehicleType: "cars",
            yearCode: "2022-1",
            yearName: "2022 Gasolina",
          },
          chassi: "9BWZZZ377VT004251",
          color: "Preto",
          doors: 4,
          enabled: true,
          engineAspiration: "turbo",
          engineDisplacement: "1.5",
          fuelType: "gasoline",
          mileageKm: 32500,
          plate: "TRD1E23",
          renavam: "12345678901",
          transmission: "automatic",
          valuationCents: 8800000,
          yearFabrication: "2021",
          yearModel: 2022,
        },
      },
    });

    await services.transition(
      context(["inventory.create", "inventory.update_unit", "sale.close"]),
      { saleId: draft.id, status: "closed" },
    );

    const tradeInListing = [...vehiclePorts.listings.values()].find(
      (listing) => listing.title === "Honda Civic Touring 1.5 Turbo",
    );
    expect(tradeInListing).toMatchObject({
      catalog: {
        brandCode: "21",
        brandName: "Honda",
        modelCode: "10234",
        modelName: "Civic Touring 1.5 Turbo",
        source: "fipe",
      },
      doors: 4,
      engineAspiration: "turbo",
      engineDisplacement: "1.5",
      fuelType: "gasoline",
      manufactureYear: 2021,
      mileageKm: 32500,
      modelYear: 2022,
      plate: "TRD1E23",
      status: "in_preparation",
      transmission: "automatic",
    });
    if (!tradeInListing) throw new Error("Expected trade-in listing.");
    const tradeInUnit = [...vehiclePorts.units.values()].find(
      (unit) => unit.listingId === tradeInListing.id,
    );
    expect(tradeInUnit).toMatchObject({
      colorName: "black",
      plate: "TRD1E23",
      status: "acquired",
      vin: "9BWZZZ377VT004251",
    });
    if (!tradeInUnit) throw new Error("Expected trade-in unit.");
    const [supplier] = [
      ...vehiclePorts.acquisitionRepository.suppliers.values(),
    ];
    expect(supplier).toMatchObject({
      displayName: "Maria",
      externalProviderId: "lead_1",
      kind: "lead",
      phone: "(11) 99999-0000",
    });
    const acquisition = vehiclePorts.acquisitionRepository.acquisitions.get(
      tradeInUnit.id,
    );
    expect(acquisition).toMatchObject({
      acquisitionPriceCents: 8800000,
      channel: "trade_in_lead",
      leadId: "lead_1",
      sourceSnapshot: {
        saleId: draft.id,
        tradeIn: { plate: "TRD1E23" },
      },
      supplierId: supplier?.id,
      unitId: tradeInUnit.id,
    });
  });
});
