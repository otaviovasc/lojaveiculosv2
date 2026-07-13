import { isActiveSalePaymentStatus } from "@lojaveiculosv2/shared";
import type { FinanceEntryBundle } from "../../../domains/finance/ports/financeRepository.js";
import type { SaleRecord } from "../../../domains/sales/ports/salesRepository.js";
import { SalePaymentCompensationRequiredError } from "../../../domains/sales/salePaymentCompensation.js";
import { SaleReversionCompensationError } from "../../../domains/sales/services/SalesService/serviceSupport.js";
import type {
  VehicleDocument,
  VehicleUnit,
} from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";

export function assertFinanceOwnership(
  sale: SaleRecord,
  unit: VehicleUnit,
  entries: readonly FinanceEntryBundle[],
): void {
  if (entries.length >= 201) {
    throw new SaleReversionCompensationError(
      "finance",
      "Sale has too many linked finance entries for a bounded reversion.",
    );
  }
  const activePaymentIds = sale.payments
    .filter((payment) => isActiveSalePaymentStatus(payment.status))
    .map((payment) => payment.id);
  if (entries.length !== activePaymentIds.length) {
    throwFinanceOwnershipError();
  }
  const expectedPaymentIds = new Set(activePaymentIds);
  const linkedPaymentIds = new Set<string>();
  for (const bundle of entries) {
    const ownsSale = bundle.links.some(
      (link) => link.targetType === "sale" && link.targetId === sale.id,
    );
    const ownsUnit = bundle.links.some(
      (link) => link.targetType === "vehicle_unit" && link.targetId === unit.id,
    );
    const isSaleEntry =
      bundle.entry.category === "vehicle_sale" ||
      bundle.entry.metadata.source === "vehicle_sale";
    const paymentLinks = bundle.links.filter(
      (link) => link.targetType === "sale_payment",
    );
    const paymentId = paymentLinks[0]?.targetId;
    if (
      !ownsSale ||
      !ownsUnit ||
      !isSaleEntry ||
      paymentLinks.length !== 1 ||
      !paymentId ||
      !expectedPaymentIds.has(paymentId) ||
      linkedPaymentIds.has(paymentId)
    ) {
      throwFinanceOwnershipError();
    }
    linkedPaymentIds.add(paymentId);
  }
}

function throwFinanceOwnershipError(): never {
  throw new SaleReversionCompensationError(
    "finance",
    "Linked finance entry ownership could not be proven one-to-one.",
  );
}

export function assertFinanceEntriesLocallyReversible(
  entries: readonly FinanceEntryBundle[],
): void {
  if (
    entries.some(
      (bundle) =>
        bundle.entry.status === "paid" || bundle.entry.paidAt !== null,
    )
  ) {
    throw new SalePaymentCompensationRequiredError("paid");
  }
}

export function assertDocumentOwnership(
  sale: SaleRecord,
  documents: readonly VehicleDocument[],
): void {
  const generatedDocuments = documents.filter(
    (document) =>
      document.metadata.renderer === "react-pdf" &&
      typeof document.metadata.template === "string",
  );
  if (generatedDocuments.length !== documents.length) {
    throw new SaleReversionCompensationError(
      "documents",
      "Sale document ownership could not be proven.",
    );
  }
  for (const kind of sale.selectedDocumentKinds) {
    if (!generatedDocuments.some((document) => document.kind === kind)) {
      throw new SaleReversionCompensationError(
        "documents",
        `Sale-generated document is missing: ${kind}.`,
      );
    }
  }
}

export function isProvenPriorCompensation(
  sale: SaleRecord,
  entries: readonly FinanceEntryBundle[],
  documents: readonly VehicleDocument[],
): boolean {
  return (
    (entries.length > 0 || documents.length > 0) &&
    entries.every(
      (bundle) =>
        bundle.entry.status === "cancelled" &&
        bundle.entry.metadata.revertedSaleId === sale.id,
    ) &&
    documents.every((document) => document.status === "voided")
  );
}
