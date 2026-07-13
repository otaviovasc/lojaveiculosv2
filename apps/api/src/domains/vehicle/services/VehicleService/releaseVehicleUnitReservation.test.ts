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

  it("fails closed when signal ownership exceeds the bounded finance query", async () => {
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
    const saleId = ports.salesRepository.sales[0]?.id;
    if (!saleId) throw new Error("Expected pending reservation sale.");
    for (let index = 0; index < 20; index += 1) {
      await ports.financeRepository.createEntry({
        amountCents: 1,
        category: "vehicle_sale",
        dueAt: null,
        links: [
          { targetId: saleId, targetType: "sale" },
          { targetId: "unit_1", targetType: "vehicle_unit" },
        ],
        metadata: { source: "vehicle_sale" },
        name: `Bounded entry ${index}`,
        paidAt: null,
        sellerUserId: null,
        status: "pending",
        storeId: context.storeId ?? "",
        tenantId: context.tenantId ?? "",
        type: "revenue",
      });
    }

    await expect(
      releaseVehicleUnitReservation(
        context,
        { outcome: "cancel", unitId: "unit_1" },
        ports,
      ),
    ).rejects.toThrow("too many linked finance entries");
    expect(ports.units.get("unit_1")?.status).toBe("reserved");
  });

  it("keeps a provider-managed signal reserved until provider compensation", async () => {
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
    const signalPayment = ports.salesRepository.payments[0];
    if (!signalPayment) throw new Error("Expected reservation signal payment.");
    ports.salesRepository.payments.splice(0, 1, {
      ...signalPayment,
      providerPaymentId: "provider-reservation-1",
    });

    await expect(
      releaseVehicleUnitReservation(
        context,
        { outcome: "cancel", unitId: "unit_1" },
        ports,
      ),
    ).rejects.toThrow("requires provider cancellation or refund");

    expect(ports.units.get("unit_1")?.status).toBe("reserved");
    expect(ports.salesRepository.sales[0]?.status).toBe("pending");
    expect(ports.salesRepository.payments[0]?.status).toBe("pending");
    expect(ports.financeRepository.entries[0]?.status).toBe("pending");
  });

  it("keeps reservation artifacts unchanged after a stale unit transition", async () => {
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
    ports.unitRepository!.saveIfStatus = vi.fn(async () => null);

    await expect(
      releaseVehicleUnitReservation(
        context,
        { outcome: "cancel", unitId: "unit_1" },
        ports,
      ),
    ).rejects.toThrow("reservation changed");

    expect(ports.units.get("unit_1")?.status).toBe("reserved");
    expect(ports.salesRepository.sales[0]?.status).toBe("pending");
    expect(ports.salesRepository.payments[0]?.status).toBe("pending");
    expect(ports.financeRepository.entries[0]?.status).toBe("pending");
  });
});
