import { describe, expect, it, vi } from "vitest";
import { attachVehicleUnit } from "./attachVehicleUnit.js";
import { reserveVehicleUnit } from "./reserveVehicleUnit.js";
import {
  createContext,
  createInMemoryVehiclePorts,
  createListing,
} from "./testSupport.js";

describe("reserveVehicleUnit payment validation", () => {
  it.each([0, -1, 9500001])(
    "rejects invalid signal amount %s before creating workflow artifacts",
    async (signalAmountCents) => {
      const context = createContext(["inventory.create", "inventory.reserve"]);
      const ports = createInMemoryVehiclePorts([
        createListing({ status: "published", unitIds: ["unit_1"] }),
      ]);
      await attachVehicleUnit(context, { listingId: "listing_1" }, ports);

      await expect(
        reserveVehicleUnit(
          context,
          {
            buyer: {
              address: null,
              document: null,
              email: null,
              name: "Buyer Example",
              phone: null,
            },
            paymentMethod: "pix",
            signalAmountCents,
            unitId: "unit_1",
          },
          ports,
        ),
      ).rejects.toThrow("signalAmountCents");
      expect(ports.units.get("unit_1")?.status).toBe("available");
      expect(ports.financeRepository.entries).toHaveLength(0);
      expect(ports.documents.size).toBe(0);
    },
  );

  it("marks document-producing reservation audits as required", async () => {
    const context = createContext(["inventory.create", "inventory.reserve"]);
    const ports = createInMemoryVehiclePorts([
      createListing({ status: "published", unitIds: ["unit_1"] }),
    ]);
    await attachVehicleUnit(context, { listingId: "listing_1" }, ports);

    await reserveVehicleUnit(
      context,
      {
        buyer: {
          address: null,
          document: null,
          email: null,
          name: "Buyer Example",
          phone: null,
        },
        paymentMethod: "pix",
        signalAmountCents: 100000,
        unitId: "unit_1",
      },
      ports,
    );

    expect(vi.mocked(context.audit.record)).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "vehicle_unit.reserve",
        criticality: "critical",
        failureTier: "required",
      }),
    );
  });
});
