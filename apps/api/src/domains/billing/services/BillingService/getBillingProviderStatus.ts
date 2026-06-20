import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { PaymentProviderStatus } from "../../ports/paymentProviderGateway.js";
import {
  requireBillingScope,
  type BillingServicePorts,
} from "./serviceSupport.js";

const fallbackStatus: PaymentProviderStatus = {
  configured: false,
  missingConfiguration: [
    "ASAAS_API_URL",
    "ASAAS_API_KEY",
    "ASAAS_WEBHOOK_SECRET",
  ],
  provider: "asaas",
  webhookConfigured: false,
};

export async function getBillingProviderStatus(
  context: ServiceContext,
  ports: BillingServicePorts,
): Promise<PaymentProviderStatus> {
  assertPermission(context, "billing.manage");
  const scope = requireBillingScope(context);

  context.logger.info(
    "billing.provider_status.read.started",
    createServiceLogMetadata(context),
  );

  const status =
    (await ports.paymentProviderGateway?.getProviderStatus()) ?? fallbackStatus;

  await context.audit.record({
    action: "billing.provider_status.read",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "billing_provider",
    metadata: {
      configured: status.configured,
      provider: status.provider,
      webhookConfigured: status.webhookConfigured,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Read billing payment provider status",
  });

  return status;
}
