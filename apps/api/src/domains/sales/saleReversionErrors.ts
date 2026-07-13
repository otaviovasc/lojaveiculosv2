import type { SaleRecord } from "./ports/salesRepository.js";

export class SaleReversionReasonError extends Error {
  constructor() {
    super("Sale reversion requires a nonblank reason.");
    this.name = "SaleReversionReasonError";
  }
}

export class SaleReversionStateError extends Error {
  constructor(
    readonly currentStatus: SaleRecord["status"],
    readonly isCurrentRevision: boolean,
  ) {
    super("Only the current closed sale revision can be reverted.");
    this.name = "SaleReversionStateError";
  }
}

export class SaleReversionUnsupportedError extends Error {
  constructor(
    readonly unsupportedReason: "acquisition_snapshot" | "trade_in_acquisition",
  ) {
    super(
      "Sale reversion cannot compensate the linked acquisition workflow yet.",
    );
    this.name = "SaleReversionUnsupportedError";
  }
}

export class SaleReversionConflictError extends Error {
  constructor() {
    super("Sale revision changed while the reversion was being created.");
    this.name = "SaleReversionConflictError";
  }
}

export class SaleReversionCompensationError extends Error {
  constructor(
    readonly compensation: "documents" | "finance" | "listing" | "unit",
    message: string,
  ) {
    super(message);
    this.name = "SaleReversionCompensationError";
  }
}
