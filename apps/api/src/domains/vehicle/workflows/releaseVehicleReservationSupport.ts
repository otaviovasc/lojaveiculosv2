import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  FinanceEntryBundle,
  FinanceRepository,
} from "../../finance/ports/financeRepository.js";
import type { VehicleUnit } from "../ports/vehicleInventoryRepository.js";
import type { VehicleSaleBundle } from "../ports/vehicleSalesRepository.js";
import { VehicleWorkflowStateError } from "./vehicleSaleWorkflowRules.js";

export function assertPendingReservationSale(
  context: ServiceContext,
  sale: VehicleSaleBundle,
  unit: VehicleUnit,
) {
  if (
    sale.sale.status !== "pending" ||
    sale.sale.unitId !== unit.id ||
    sale.sale.storeId !== context.storeId ||
    sale.sale.tenantId !== context.tenantId
  ) {
    throw new VehicleWorkflowStateError("Pending reservation sale mismatch.");
  }
}

export function assertPendingSignal(
  salePaymentStatus: string,
  financeEntry: FinanceEntryBundle,
) {
  if (salePaymentStatus === "paid" || financeEntry.entry.status === "paid") {
    throw new VehicleWorkflowStateError(
      "Paid reservation signal requires a refund or correction workflow.",
    );
  }
}

export function assertReservedUnit(unit: VehicleUnit) {
  if (unit.status !== "reserved") {
    throw new VehicleWorkflowStateError(
      `Vehicle unit must be reserved to release; current status is ${unit.status}.`,
    );
  }
}

export async function findReservationFinanceEntry(
  repository: FinanceRepository,
  context: ServiceContext,
  salePaymentId: string,
): Promise<FinanceEntryBundle> {
  const entries = await repository.list({
    limit: 20,
    offset: 0,
    storeId: context.storeId,
    targetId: salePaymentId,
    targetType: "sale_payment",
    tenantId: context.tenantId,
  });
  const entry = entries.find(
    (bundle) =>
      bundle.entry.category === "vehicle_reservation_signal" ||
      bundle.entry.metadata.source === "vehicle_reservation",
  );
  if (!entry) {
    throw new VehicleWorkflowStateError(
      "Reservation signal finance entry not found.",
    );
  }
  return entry;
}
