import { isActiveSalePaymentStatus } from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  FinanceEntryBundle,
  FinanceRepository,
} from "../../finance/ports/financeRepository.js";
import type { VehicleUnit } from "../ports/vehicleInventoryRepository.js";
import type {
  VehicleSaleBundle,
  VehicleSalePayment,
} from "../ports/vehicleSalesRepository.js";
import {
  VehicleWorkflowStateError,
  VehicleWorkflowValidationError,
} from "./vehicleSaleWorkflowRules.js";

export async function findReservationSignalFinance(
  repository: FinanceRepository,
  context: ServiceContext,
  sale: VehicleSaleBundle,
  unit: VehicleUnit,
): Promise<{
  financeEntry: FinanceEntryBundle;
  signalPayment: VehicleSalePayment;
}> {
  const entries = await repository.list({
    limit: 21,
    offset: 0,
    storeId: context.storeId,
    targetId: sale.sale.id,
    targetType: "sale",
    tenantId: context.tenantId,
  });
  if (entries.length >= 21) {
    throw new VehicleWorkflowStateError(
      "Reservation has too many linked finance entries for bounded signal resolution.",
    );
  }
  const reservationEntries = entries.filter(
    (bundle) =>
      bundle.entry.category === "vehicle_reservation_signal" ||
      bundle.entry.metadata.source === "vehicle_reservation",
  );
  if (reservationEntries.length !== 1) {
    throw new VehicleWorkflowStateError(
      reservationEntries.length
        ? "Reservation has multiple signal finance entries."
        : "Reservation signal finance entry not found.",
    );
  }
  const [financeEntry] = reservationEntries;
  if (!financeEntry) {
    throw new VehicleWorkflowStateError(
      "Reservation signal finance entry not found.",
    );
  }
  const paymentLinks = financeEntry.links.filter(
    (link) => link.targetType === "sale_payment",
  );
  const ownsUnit = financeEntry.links.some(
    (link) => link.targetType === "vehicle_unit" && link.targetId === unit.id,
  );
  if (paymentLinks.length !== 1 || !ownsUnit) {
    throw new VehicleWorkflowStateError(
      "Reservation signal finance entry ownership mismatch.",
    );
  }
  const signalPayment = sale.payments.find(
    (payment) =>
      payment.id === paymentLinks[0]?.targetId &&
      isActiveSalePaymentStatus(payment.status) &&
      payment.amountCents > 0 &&
      payment.principalCents > 0,
  );
  if (!signalPayment) {
    throw new VehicleWorkflowValidationError("reservation sale payment");
  }
  return { financeEntry, signalPayment };
}
