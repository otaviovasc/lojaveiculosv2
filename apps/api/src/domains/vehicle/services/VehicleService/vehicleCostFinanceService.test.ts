import { describe, expect, it } from "vitest";
import { VehicleCostFinanceEntryDuplicateError } from "../../vehicleCostErrors.js";
import { addVehicleCost } from "./addVehicleCost.js";
import { updateVehicleCost } from "./updateVehicleCost.js";
import { voidVehicleCost } from "./voidVehicleCost.js";
import { attachVehicleUnit } from "./attachVehicleUnit.js";
import {
  createContext,
  createInMemoryVehiclePorts,
  createListing,
} from "./testSupport.js";

describe("VehicleService cost finance entries", () => {
  it("mirrors vehicle costs into finance entries with typed links", async () => {
    const context = createContext([
      "inventory.create",
      "inventory.cost_create",
    ]);
    const ports = createInMemoryVehiclePorts([
      createListing({ unitIds: ["unit_1"] }),
    ]);
    await attachVehicleUnit(context, { listingId: "listing_1" }, ports);

    const cost = await addVehicleCost(
      context,
      {
        amountCents: 120000,
        description: "Preparacao",
        kind: "preparation",
        unitId: "unit_1",
      },
      ports,
    );

    expect(cost.id).toBe("cost_1");
    const [entry] = ports.financeRepository.entries;
    expect(entry).toMatchObject({
      amountCents: 120000,
      category: "vehicle_preparation",
      status: "paid",
      type: "expense",
    });
    expect(
      ports.financeRepository.links.map((link) => link.targetType),
    ).toEqual(["vehicle_cost", "vehicle_unit"]);
    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "vehicle_cost.create" }),
    );
  });

  it("corrects the scoped cost and linked finance entry with audit history", async () => {
    const context = createContext([
      "inventory.create",
      "inventory.cost_create",
      "inventory.cost_update",
    ]);
    const ports = createInMemoryVehiclePorts([
      createListing({ unitIds: ["unit_1"] }),
    ]);
    await attachVehicleUnit(context, { listingId: "listing_1" }, ports);
    const original = await addVehicleCost(
      context,
      {
        amountCents: 120000,
        description: "Preparacao",
        kind: "preparation",
        unitId: "unit_1",
      },
      ports,
    );

    const corrected = await updateVehicleCost(
      context,
      {
        amountCents: 95000,
        costDate: new Date("2026-02-03T12:00:00.000Z"),
        costId: original.id,
        description: "Pintura corrigida",
        kind: "repair",
        unitId: "unit_1",
      },
      ports,
    );

    expect(corrected).toMatchObject({
      amountCents: 95000,
      description: "Pintura corrigida",
      kind: "repair",
      status: "active",
    });
    expect(ports.financeRepository.entries[0]).toMatchObject({
      amountCents: 95000,
      category: "vehicle_repair",
      status: "paid",
    });
    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "vehicle_cost.update" }),
    );
  });

  it("voids without deleting history and cancels the linked finance entry", async () => {
    const context = createContext([
      "inventory.create",
      "inventory.cost_create",
      "inventory.cost_void",
    ]);
    const ports = createInMemoryVehiclePorts([
      createListing({ unitIds: ["unit_1"] }),
    ]);
    await attachVehicleUnit(context, { listingId: "listing_1" }, ports);
    const original = await addVehicleCost(
      context,
      {
        amountCents: 120000,
        description: "Preparacao",
        kind: "preparation",
        unitId: "unit_1",
      },
      ports,
    );

    const voided = await voidVehicleCost(
      context,
      {
        costId: original.id,
        reason: "Nota lançada em duplicidade",
        unitId: "unit_1",
      },
      ports,
    );

    expect(voided).toMatchObject({
      id: original.id,
      status: "voided",
      voidReason: "Nota lançada em duplicidade",
    });
    expect(ports.operationsRepository.costs).toHaveLength(1);
    expect(ports.financeRepository.entries[0]?.status).toBe("cancelled");
    expect(ports.financeRepository.entries[0]?.metadata.cancelledReason).toBe(
      "Nota lançada em duplicidade",
    );
    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "vehicle_cost.void" }),
    );
  });

  it("rejects ambiguous duplicate finance links instead of updating arbitrarily", async () => {
    const context = createContext([
      "inventory.create",
      "inventory.cost_create",
      "inventory.cost_update",
    ]);
    const ports = createInMemoryVehiclePorts([createListing()]);
    const unit = await attachVehicleUnit(
      context,
      { listingId: "listing_1" },
      ports,
    );
    const original = await addVehicleCost(
      context,
      {
        amountCents: 120000,
        description: "Preparacao",
        kind: "preparation",
        unitId: unit.id,
      },
      ports,
    );
    await ports.financeRepository.createEntry({
      amountCents: original.amountCents,
      category: "vehicle_preparation",
      dueAt: original.costDate,
      links: [{ targetId: original.id, targetType: "vehicle_cost" }],
      metadata: { source: "legacy_duplicate" },
      name: "Duplicated vehicle cost",
      paidAt: original.costDate,
      sellerUserId: null,
      status: "paid",
      storeId: context.storeId,
      tenantId: context.tenantId,
      type: "expense",
    });

    await expect(
      updateVehicleCost(
        context,
        {
          amountCents: 95000,
          costId: original.id,
          kind: "repair",
          unitId: unit.id,
        },
        ports,
      ),
    ).rejects.toBeInstanceOf(VehicleCostFinanceEntryDuplicateError);
    expect(ports.financeRepository.entries).toHaveLength(2);
    expect(context.audit.record).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "vehicle_cost.update" }),
    );
  });
});
