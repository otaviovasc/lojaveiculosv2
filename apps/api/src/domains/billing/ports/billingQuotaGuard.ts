export type BillingQuotaKey = "plate_lookup" | "seller" | "vehicle";

export type BillingQuotaGuard = {
  assertAvailable: (input: {
    increment?: number;
    quotaKey: BillingQuotaKey;
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
    super("No effective billing contract is available for this store.");
    this.name = "BillingContractUnavailableError";
  }
}
