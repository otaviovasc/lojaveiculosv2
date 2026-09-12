import type { BillingProviderSyncResult } from "../../ports/billingWebhookRepository.js";

export function webhookResultStatus(
  status: BillingProviderSyncResult["status"],
) {
  if (status === "synced") return "processed" as const;
  if (status === "pending_reconciliation") {
    return "pending_reconciliation" as const;
  }
  return "ignored" as const;
}
