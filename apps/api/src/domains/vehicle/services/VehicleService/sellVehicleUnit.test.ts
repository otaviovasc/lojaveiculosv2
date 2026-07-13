import { describe, expect, it, vi } from "vitest";
import { attachVehicleUnit } from "./attachVehicleUnit.js";
import { reserveVehicleUnit } from "./reserveVehicleUnit.js";
import { sellVehicleUnit } from "./sellVehicleUnit.js";
import {
  createContext,
  createInMemoryVehiclePorts,
  createListing,
} from "./testSupport.js";

describe("sellVehicleUnit payment accounting", () => {
  it("rejects nonpositive prices and incomplete principal coverage", async () => {
    const { context, ports } = await setup();

    await expect(
      sellVehicleUnit(
        context,
        { ...saleInput(), paidAmountCents: 1, salePriceCents: -1 },
        ports,
      ),
    ).rejects.toThrow("salePriceCents");
    await expect(
      sellVehicleUnit(
        context,
        {
          ...saleInput(),
          paidAmountCents: 9499999,
          salePriceCents: 9500000,
        },
        ports,
      ),
    ).rejects.toThrow("payment principal coverage");
    expect(ports.units.get("unit_1")?.status).toBe("available");
    expect(ports.financeRepository.entries).toHaveLength(0);
    expect(ports.documents.size).toBe(0);
  });

  it("splits direct-sale overpayment into principal and extras", async () => {
    const { context, ports } = await setup();

    await sellVehicleUnit(
      context,
      {
        ...saleInput(),
        paidAmountCents: 9600000,
        salePriceCents: 9500000,
      },
      ports,
    );

    expect(ports.salesRepository.payments[0]).toMatchObject({
      amountCents: 9600000,
      extraCents: 100000,
      principalCents: 9500000,
    });
    expect(ports.financeRepository.entries[0]).toMatchObject({
      amountCents: 9600000,
      metadata: { extraCents: 100000, principalCents: 9500000 },
    });
    expect(vi.mocked(context.audit.record)).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "vehicle_unit.sell",
        criticality: "critical",
        failureTier: "required",
      }),
    );
  });

  it("rejects direct sale when a pending reservation owns the unit", async () => {
    const { context, ports } = await setup();
    await reserveVehicleUnit(
      createContext(["inventory.reserve"]),
      {
        buyer: saleInput().buyer,
        paymentMethod: "pix",
        signalAmountCents: 100000,
        unitId: "unit_1",
      },
      ports,
    );
    const artifactCounts = {
      documents: ports.documents.size,
      financeEntries: ports.financeRepository.entries.length,
      sales: ports.salesRepository.sales.length,
    };

    await expect(sellVehicleUnit(context, saleInput(), ports)).rejects.toThrow(
      "existing pending sale",
    );

    expect(ports.units.get("unit_1")?.status).toBe("reserved");
    expect(ports.documents.size).toBe(artifactCounts.documents);
    expect(ports.financeRepository.entries).toHaveLength(
      artifactCounts.financeEntries,
    );
    expect(ports.salesRepository.sales).toHaveLength(artifactCounts.sales);
    expect(ports.salesRepository.sales[0]?.status).toBe("pending");
  });

  it("stops before finance and document work when the unit status changed", async () => {
    const { context, ports } = await setup();
    ports.unitRepository!.saveIfStatus = vi.fn(async () => null);

    await expect(sellVehicleUnit(context, saleInput(), ports)).rejects.toThrow(
      "status changed",
    );

    expect(ports.units.get("unit_1")?.status).toBe("available");
    expect(ports.financeRepository.entries).toHaveLength(0);
    expect(ports.documents.size).toBe(0);
  });

  it("serializes listing stock before unit sales and recomputes sold-out state", async () => {
    const { context, ports } = await setup();
    await attachVehicleUnit(context, { listingId: "listing_1" }, ports);
    const unitRepository = ports.unitRepository;
    if (!unitRepository) throw new Error("Expected unit repository fake.");
    const calls: string[] = [];
    const lockListing = vi
      .mocked(ports.listingRepository.lockForStockTransition)
      .getMockImplementation();
    const saveUnit = vi
      .mocked(unitRepository.saveIfStatus)
      .getMockImplementation();
    if (!lockListing || !saveUnit)
      throw new Error("Expected repository fakes.");
    vi.mocked(
      ports.listingRepository.lockForStockTransition,
    ).mockImplementation(async (input) => {
      calls.push("lock-listing");
      return lockListing(input);
    });
    vi.mocked(unitRepository.saveIfStatus).mockImplementation(
      async (unit, expectedStatus) => {
        calls.push(`save-unit:${unit.id}`);
        return saveUnit(unit, expectedStatus);
      },
    );

    await expect(
      sellVehicleUnit(context, saleInput(), ports),
    ).resolves.toMatchObject({ status: "published" });
    await expect(
      sellVehicleUnit(context, { ...saleInput(), unitId: "unit_2" }, ports),
    ).resolves.toMatchObject({ status: "sold_out" });

    expect(calls).toEqual([
      "lock-listing",
      "save-unit:unit_1",
      "lock-listing",
      "save-unit:unit_2",
    ]);
  });
});

async function setup() {
  const context = createContext(["inventory.create", "inventory.sell"]);
  const ports = createInMemoryVehiclePorts([
    createListing({ status: "published", unitIds: ["unit_1"] }),
  ]);
  await attachVehicleUnit(context, { listingId: "listing_1" }, ports);
  return { context, ports };
}

function saleInput() {
  return {
    buyer: {
      address: null,
      document: null,
      email: null,
      name: "Buyer Example",
      phone: null,
    },
    paymentMethod: "pix" as const,
    unitId: "unit_1",
  };
}
