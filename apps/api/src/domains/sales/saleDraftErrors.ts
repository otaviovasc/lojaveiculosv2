import type { SaleRecord } from "./ports/salesRepository.js";

export class SaleDraftUpdateStateError extends Error {
  constructor(readonly currentStatus: SaleRecord["status"]) {
    super(
      `Sale can only be edited while draft or pending. Current status: ${currentStatus}.`,
    );
    this.name = "SaleDraftUpdateStateError";
  }
}

export class SaleDraftUpdateConflictError extends Error {
  constructor() {
    super("Sale state changed while the draft update was being saved.");
    this.name = "SaleDraftUpdateConflictError";
  }
}

export class SalePaymentIdentityError extends Error {
  constructor(
    readonly paymentId: string,
    readonly reason: "duplicate" | "unknown",
  ) {
    super(`Sale payment id is ${reason}: ${paymentId}.`);
    this.name = "SalePaymentIdentityError";
  }
}

export class SalePendingUnitChangeError extends Error {
  constructor() {
    super("Reserved sale vehicle unit cannot be changed.");
    this.name = "SalePendingUnitChangeError";
  }
}
