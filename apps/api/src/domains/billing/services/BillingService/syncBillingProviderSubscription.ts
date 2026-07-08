import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  BillingProviderSubscriptionRecord,
  BillingProviderSubscriptionSyncResult,
} from "../../ports/billingProviderRepository.js";
import type {
  PaymentProviderBillingType,
  PaymentProviderGateway,
} from "../../ports/paymentProviderGateway.js";
import {
  assertSyncableAccount,
  BillingProviderSyncError,
  customerExternalReference,
  formatDate,
  isRealProviderId,
  realProviderId,
  subscriptionDescription,
  subscriptionExternalReference,
  toLocalSubscriptionStatus,
  tomorrow,
  toSyncError,
} from "../../readModels/billingProviderSyncModel.js";
import {
  getBillingProviderRepository,
  requireBillingScope,
  requireTenantBillingScope,
  type BillingServicePorts,
} from "./serviceSupport.js";

export { BillingProviderSyncError };

export type SyncBillingProviderSubscriptionInput = {
  billingType?: PaymentProviderBillingType;
  nextDueDate?: Date;
  updatePendingPayments?: boolean;
};

export async function syncBillingProviderSubscription(
  context: ServiceContext,
  input: SyncBillingProviderSubscriptionInput,
  ports: BillingServicePorts,
): Promise<BillingProviderSubscriptionSyncResult> {
  assertPermission(context, "billing.manage");
  const scope = context.storeId
    ? requireBillingScope(context)
    : { ...requireTenantBillingScope(context), storeId: null };
  const repository = getBillingProviderRepository(ports);
  const gateway = getPaymentProviderGateway(ports);
  const account = assertSyncableAccount(
    await repository.getProviderAccount({
      billingManagedBy: context.billingManagedBy ?? "store_owner",
      currentActorCanManage: context.permissions.includes("billing.manage"),
      ...(scope.storeId ? { storeId: scope.storeId } : {}),
      tenantId: scope.tenantId,
    }),
  );
  const subscription = account.subscription;
  const billingType = input.billingType ?? "PIX";
  const nextDueDate = formatDate(input.nextDueDate ?? tomorrow());
  const chargeTotalCents = account.chargePreview.totalCents;

  context.logger.info(
    "billing.provider_subscription.sync.started",
    createServiceLogMetadata(context, {
      billingType,
      chargeTotalCents,
      hasExistingProviderSubscriptionId: isRealProviderId(
        subscription.providerSubscriptionId,
      ),
      provider: "asaas",
      subscriptionId: subscription.id,
    }),
  );

  try {
    const customer = await gateway.syncCustomer({
      documentNumber: account.billingCustomer.documentNumber,
      email: account.billingCustomer.email,
      existingProviderCustomerId: realProviderId(
        account.billingCustomer.providerCustomerId,
      ),
      externalReference: customerExternalReference(scope.tenantId),
      name: account.billingCustomer.name,
    });
    await repository.saveProviderCustomer({
      billingCustomerId: account.billingCustomer.id,
      provider: customer.provider,
      providerCustomerId: customer.providerCustomerId,
    });

    const providerSubscription = await gateway.syncSubscription({
      billingType,
      customerId: customer.providerCustomerId,
      description: subscriptionDescription(account),
      existingProviderSubscriptionId: realProviderId(
        subscription.providerSubscriptionId,
      ),
      externalReference: subscriptionExternalReference(subscription.id),
      nextDueDate,
      updatePendingPayments: input.updatePendingPayments ?? true,
      valueCents: chargeTotalCents,
    });
    const localStatus = toLocalSubscriptionStatus(providerSubscription);
    await repository.saveProviderSubscription({
      currentPeriodEnd: providerSubscription.currentPeriodEnd,
      currentPeriodStart: subscription.currentPeriodStart ?? new Date(),
      provider: providerSubscription.provider,
      providerSubscriptionId: providerSubscription.providerSubscriptionId,
      status: localStatus,
      subscriptionId: subscription.id,
    });

    await auditSync(context, {
      chargeTotalCents,
      outcome: "succeeded",
      providerCustomerId: customer.providerCustomerId,
      providerSubscriptionId: providerSubscription.providerSubscriptionId,
      reason: null,
      status: localStatus,
      subscriptionId: subscription.id,
    });
    return {
      billingType,
      chargeTotalCents,
      nextDueDate,
      provider: providerSubscription.provider,
      providerCustomerId: customer.providerCustomerId,
      providerSubscriptionId: providerSubscription.providerSubscriptionId,
      status: localStatus,
      subscriptionId: subscription.id,
      synchronizedAt: new Date().toISOString(),
    };
  } catch (error) {
    const syncError = toSyncError(error);
    await auditSync(context, {
      chargeTotalCents,
      outcome: "failed",
      providerCustomerId: realProviderId(
        account.billingCustomer.providerCustomerId,
      ),
      providerSubscriptionId: realProviderId(
        subscription.providerSubscriptionId,
      ),
      reason: syncError.reason,
      status: subscription.status,
      subscriptionId: subscription.id,
    });
    throw syncError;
  }
}

function getPaymentProviderGateway(
  ports: BillingServicePorts,
): Required<Pick<PaymentProviderGateway, "syncCustomer" | "syncSubscription">> {
  if (!ports.paymentProviderGateway?.syncCustomer) {
    throw new BillingProviderSyncError(
      "missing_provider_customer_sync",
      "Billing payment provider customer sync is not configured.",
      503,
    );
  }
  if (!ports.paymentProviderGateway.syncSubscription) {
    throw new BillingProviderSyncError(
      "missing_provider_subscription_sync",
      "Billing payment provider subscription sync is not configured.",
      503,
    );
  }
  return {
    syncCustomer: ports.paymentProviderGateway.syncCustomer,
    syncSubscription: ports.paymentProviderGateway.syncSubscription,
  };
}

async function auditSync(
  context: ServiceContext,
  input: {
    chargeTotalCents: number;
    outcome: "failed" | "succeeded";
    providerCustomerId: string | null;
    providerSubscriptionId: string | null;
    reason: string | null;
    status: BillingProviderSubscriptionRecord["status"];
    subscriptionId: string;
  },
) {
  await context.audit.record({
    action: "billing.provider_subscription.sync",
    actor: context.actor,
    category: "integration",
    criticality: "critical",
    entityId: input.subscriptionId,
    entityType: "billing_subscription",
    metadata: {
      chargeTotalCents: input.chargeTotalCents,
      provider: "asaas",
      providerCustomerId: input.providerCustomerId,
      providerSubscriptionId: input.providerSubscriptionId,
      reason: input.reason,
      status: input.status,
    },
    outcome: input.outcome,
    requestId: context.requestId,
    storeId: context.storeId,
    tenantId: context.tenantId,
    summary: "Synchronized billing subscription with payment provider",
  });
}
