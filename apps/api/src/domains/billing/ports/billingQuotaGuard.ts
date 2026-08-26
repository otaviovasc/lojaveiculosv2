export type BillingQuotaKey = "plate_lookup" | "seller" | "vehicle";

export type BillingQuotaAllowance = {
  limit: number;
  remaining: number;
  used: number;
};

export type BillingQuotaUsageOutcome =
  "provider_failed" | "released" | "succeeded";

export type BillingQuotaUsageReservation = {
  reservationId: string;
};

export type BillingQuotaGuard = {
  assertAvailable: (input: {
    increment?: number;
    quotaKey: BillingQuotaKey;
    storeId: string;
    tenantId: string;
  }) => Promise<void>;
  getAllowance?: (input: {
    quotaKey: BillingQuotaKey;
    storeId: string;
    tenantId: string;
  }) => Promise<BillingQuotaAllowance>;
  reserveUsage?: (input: {
    increment?: number;
    provider: string;
    quotaKey: BillingQuotaKey;
    requestId?: string;
    storeId: string;
    tenantId: string;
  }) => Promise<BillingQuotaUsageReservation>;
  markUsageStarted?: (input: {
    reservationId: string;
    storeId: string;
    tenantId: string;
  }) => Promise<void>;
  finalizeUsage?: (input: {
    failureCode?: string;
    outcome: BillingQuotaUsageOutcome;
    reservationId: string;
    storeId: string;
    tenantId: string;
  }) => Promise<void>;
};

export class BillingQuotaExceededError extends Error {
  readonly current: number;
  readonly limit: number;
  readonly quotaKey: BillingQuotaKey;

  constructor(input: {
    current: number;
    limit: number;
    quotaKey: BillingQuotaKey;
  }) {
    super(
      `Billing quota exceeded: ${input.quotaKey} (${input.current}/${input.limit}).`,
    );
    this.name = "BillingQuotaExceededError";
    this.current = input.current;
    this.limit = input.limit;
    this.quotaKey = input.quotaKey;
  }
}

export class BillingContractUnavailableError extends Error {
  constructor() {
    super("Free billing access is temporarily being repaired for this store.");
    this.name = "BillingContractUnavailableError";
  }
}
