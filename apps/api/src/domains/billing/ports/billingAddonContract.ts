import type { StoreId } from "@lojaveiculosv2/shared";

export type BillingAddonContractStatus =
  "pending" | "scheduled" | "paid_awaiting_setup" | "active" | "cancelled";

export class BillingAddonContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingAddonContractError";
  }
}

export type BillingAddonContract = {
  addonCode: string;
  id: string;
  cancellationScheduledFor: Date | null;
  monthlyPriceCents: number;
  paidAt: Date | null;
  scheduledFor: Date | null;
  setupCompletedAt: Date | null;
  setupConnectionId: string | null;
  status: BillingAddonContractStatus;
  storeId: StoreId;
  supportCode: string | null;
};
