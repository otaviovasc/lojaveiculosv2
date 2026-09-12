import { isActiveSalePaymentStatus } from "@lojaveiculosv2/shared";
import type { SnapshotRecord } from "./salesSnapshot";
import type { SalePaymentLine, SaleRecord } from "./types";

export type FinancingPaymentSyncState =
  "multiple" | "none" | "single" | "single_mismatch";

export function financingPaymentSyncState(
  sale: Pick<SaleRecord, "payments">,
  financing?: SnapshotRecord,
): FinancingPaymentSyncState {
  const indexes = activeFinancingPaymentIndexes(sale);
  const count = indexes.length;
  if (count === 0) return "none";
  if (count > 1) return "multiple";
  const payment = sale.payments[indexes[0] ?? -1];
  if (payment && financing && !financingLineMatches(payment, financing)) {
    return "single_mismatch";
  }
  return "single";
}

export function synchronizeSingleFinancingPayment(
  sale: SaleRecord,
  financing: SnapshotRecord,
): SaleRecord {
  const indexes = activeFinancingPaymentIndexes(sale);
  if (indexes.length !== 1) return sale;
  const financingIndex = indexes[0];
  if (financingIndex === undefined) return sale;

  return {
    ...sale,
    payments: sale.payments.map((payment, index) =>
      index === financingIndex
        ? synchronizeFinancingLine(payment, financing)
        : payment,
    ),
  };
}

function activeFinancingPaymentIndexes(
  sale: Pick<SaleRecord, "payments">,
): number[] {
  const indexes: number[] = [];
  sale.payments.forEach((payment, index) => {
    if (
      payment.method === "financing" &&
      isActiveSalePaymentStatus(payment.status)
    ) {
      indexes.push(index);
    }
  });
  return indexes;
}

function synchronizeFinancingLine(
  payment: SalePaymentLine,
  financing: SnapshotRecord,
): SalePaymentLine {
  const metadata = { ...payment.metadata };
  let principalCents = payment.principalCents;
  let installments = payment.installments;

  if (hasOwn(financing, "bankName")) {
    const bankName = readText(financing.bankName);
    setMetadata(metadata, "bankName", bankName);
    setMetadata(metadata, "methodReference", bankName);
  }
  if (hasOwn(financing, "financedAmountCents")) {
    principalCents = readNonNegativeInteger(financing.financedAmountCents) ?? 0;
    setMetadata(
      metadata,
      "financedAmountCents",
      principalCents > 0 ? principalCents : null,
    );
  }
  if (hasOwn(financing, "rank")) {
    setMetadata(metadata, "financingRank", readText(financing.rank));
  }
  if (hasOwn(financing, "installmentsCount")) {
    installments = readPositiveInteger(financing.installmentsCount);
    setMetadata(metadata, "installmentsCount", installments);
  }
  if (hasOwn(financing, "installmentAmountCents")) {
    setMetadata(
      metadata,
      "installmentAmountCents",
      readPositiveInteger(financing.installmentAmountCents),
    );
  }
  if (hasOwn(financing, "interestRatePercentage")) {
    setMetadata(
      metadata,
      "interestRatePercentage",
      readNonNegativeNumber(financing.interestRatePercentage),
    );
  }
  if (hasOwn(financing, "status")) {
    setMetadata(metadata, "financingStatus", readText(financing.status));
  }

  return {
    ...payment,
    amountCents: principalCents + payment.extraCents,
    installments,
    metadata,
    principalCents,
  };
}

function financingLineMatches(
  payment: SalePaymentLine,
  financing: SnapshotRecord,
): boolean {
  if (hasOwn(financing, "bankName")) {
    const expected = readText(financing.bankName);
    if (
      readText(payment.metadata.bankName) !== expected ||
      readText(payment.metadata.methodReference) !== expected
    ) {
      return false;
    }
  }
  if (
    hasOwn(financing, "financedAmountCents") &&
    payment.principalCents !==
      (readNonNegativeInteger(financing.financedAmountCents) ?? 0)
  ) {
    return false;
  }
  if (
    hasOwn(financing, "rank") &&
    readText(payment.metadata.financingRank) !== readText(financing.rank)
  ) {
    return false;
  }
  if (
    hasOwn(financing, "installmentsCount") &&
    payment.installments !== readPositiveInteger(financing.installmentsCount)
  ) {
    return false;
  }
  return true;
}

function hasOwn(record: SnapshotRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function readNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function readPositiveInteger(value: unknown): number | null {
  const parsed = readNonNegativeInteger(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

function readNonNegativeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function setMetadata(
  metadata: Record<string, unknown>,
  key: string,
  value: number | string | null,
): void {
  if (value === null) delete metadata[key];
  else metadata[key] = value;
}
