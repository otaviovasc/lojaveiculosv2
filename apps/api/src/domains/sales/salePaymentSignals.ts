import { isActiveSalePaymentStatus } from "@lojaveiculosv2/shared";
import type {
  SaveSaleDraftInput,
  SaveSalePaymentInput,
} from "./ports/salesRepository.js";

type SignalCandidate = {
  amountCents: number;
  metadata: Record<string, unknown>;
  principalCents: number;
  status: "cancelled" | "paid" | "pending" | "refunded";
};

export function findReservationSignalPayment<T extends SignalCandidate>(
  payments: readonly T[],
): T | undefined {
  const active = (payment: T) =>
    isActiveSalePaymentStatus(payment.status) &&
    payment.amountCents > 0 &&
    payment.principalCents > 0;
  return (
    payments.find(
      (payment) =>
        payment.metadata.reservationSignal === true && active(payment),
    ) ?? payments.find(active)
  );
}

export function markDraftReservationSignal(
  input: SaveSaleDraftInput,
): SaveSaleDraftInput {
  if (!input.payments) return input;
  const signalIndex = input.payments.findIndex(isInputSignalCandidate);
  if (signalIndex < 0) return input;
  return {
    ...input,
    payments: input.payments.map((payment, index) => ({
      ...payment,
      metadata: {
        ...(payment.metadata ?? {}),
        reservationSignal: index === signalIndex,
      },
    })),
  };
}

function isInputSignalCandidate(payment: SaveSalePaymentInput): boolean {
  return (
    isActiveSalePaymentStatus(payment.status ?? "pending") &&
    payment.amountCents > 0 &&
    (payment.principalCents ?? payment.amountCents) > 0
  );
}
