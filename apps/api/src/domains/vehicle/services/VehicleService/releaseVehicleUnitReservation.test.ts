import { describe, expect, it, vi } from "vitest";
import { attachVehicleUnit } from "./attachVehicleUnit.js";
import { releaseVehicleUnitReservation } from "./releaseVehicleUnitReservation.js";
import { reserveVehicleUnit } from "./reserveVehicleUnit.js";
import {
  createContext,
  createInMemoryVehiclePorts,
  createListing,
} from "./testSupport.js";

describe("releaseVehicleUnitReservation", () => {
  it.each([
    ["cancel", "Reservation cancelled", "vehicle_unit.reservation.cancel"],
    ["expire", "Reservation expired", "vehicle_unit.reservation.expire"],
  ] as const)(
    "%s outcome unlocks a pending reservation and cancels its signal",
    async (outcome, reason, action) => {
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

      const listing = await releaseVehicleUnitReservation(
        context,
        { outcome, unitId: "unit_1" },
        ports,
      );

      expect(listing.status).toBe("published");
      expect(ports.units.get("unit_1")?.status).toBe("available");
      expect(ports.salesRepository.sales[0]?.status).toBe("cancelled");
      expect(ports.salesRepository.payments[0]?.status).toBe("cancelled");
      const [financeEntry] = ports.financeRepository.entries;
      expect(financeEntry?.status).toBe("cancelled");
      expect(financeEntry?.metadata).toMatchObject({
        cancelledReason: reason,
        reservationOutcome: outcome,
      });
      const auditEvent = vi
        .mocked(context.audit.record)
        .mock.calls.map(([event]) => event)
        .find((event) => event.action === action);
      expect(auditEvent?.action).toBe(action);
      expect(auditEvent?.summary).toContain("vehicle unit reservation");
    },
  );
});
