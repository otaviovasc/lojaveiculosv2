import type { TenantId } from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../shared/serviceContext.js";

export async function recordFinancingOAuthCallbackAudit(
  context: ServiceContext,
  transaction: { id: string; tenantId: TenantId },
  outcome: "cancelled" | "failed",
) {
  await context.audit.record({
    action: "financing.oauth.callback",
    actor: context.actor,
    category: "authorization",
    entityId: transaction.id,
    entityType: "financing_oauth_transaction",
    metadata: { provider: "credere" },
    outcome: outcome === "failed" ? "failed" : "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    summary:
      outcome === "failed"
        ? "Credere OAuth callback failed"
        : "Credere OAuth authorization was cancelled",
    tenantId: transaction.tenantId,
  });
}
