import { describe, expect, it } from "vitest";
import { attachVehicleUnit } from "./attachVehicleUnit.js";
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
