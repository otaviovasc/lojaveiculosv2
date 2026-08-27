import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  BillingProviderSubscriptionRecord,
  BillingProviderSubscriptionSyncResult,
} from "../../ports/billingProviderRepository.js";
import type { PaymentProviderBillingType } from "../../ports/paymentProviderGateway.js";
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
  type BillingServicePorts,
} from "./serviceSupport.js";
import {
  getPaymentProviderGateway,
  recurringTotalCents,
} from "../../readModels/billingProviderSubscriptionSyncSupport.js";
import { cancelEmptyBillingProviderSubscription } from "./cancelEmptyBillingProviderSubscription.js";

export { BillingProviderSyncError };

export type SyncBillingProviderSubscriptionInput = {
  billingType?: PaymentProviderBillingType;
  cancelWhenEmpty?: boolean;
  nextDueDate?: Date;
  updatePendingPayments?: boolean;
};

export async function syncBillingProviderSubscription(
  context: ServiceContext,
  input: SyncBillingProviderSubscriptionInput,
  ports: BillingServicePorts,
): Promise<BillingProviderSubscriptionSyncResult> {
  assertPermission(context, "billing.manage");
  const scope = requireBillingScope(context);
  const observationStartedAt = new Date();
  const repository = getBillingProviderRepository(ports);
  const gateway = getPaymentProviderGateway(ports);
  const account = assertSyncableAccount(
    await repository.getProviderAccount({
      billingManagedBy: context.billingManagedBy ?? "store_owner",
      currentActorCanManage: context.permissions.includes("billing.manage"),
      storeId: scope.storeId,
      tenantId: scope.tenantId,
    }),
    input.cancelWhenEmpty ? { allowEmptyChargePreview: true } : {},
  );
  const subscription = account.subscription;
  const billingType = input.billingType ?? "PIX";
  const renewalDate = input.nextDueDate ?? tomorrow();
  const nextDueDate = formatDate(renewalDate);
  const chargeTotalCents = recurringTotalCents(
    account.chargePreview.lineItems,
    renewalDate,
  );

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
    if (chargeTotalCents <= 0 && input.cancelWhenEmpty) {
      return cancelEmptyBillingProviderSubscription(
        context,
        account,
        billingType,
        nextDueDate,
        repository,
        gateway,
      );
    }
    const customer = await gateway.syncCustomer({
      documentNumber: account.billingCustomer.documentNumber,
      email: account.billingCustomer.email,
      existingProviderCustomerId: realProviderId(
        account.billingCustomer.providerCustomerId,
      ),
      externalReference: customerExternalReference(scope.tenantId),
      name: account.billingCustomer.name,
    });
    const savedCustomer = await repository.saveProviderCustomer({
      billingCustomerId: account.billingCustomer.id,
      provider: customer.provider,
      providerCustomerId: customer.providerCustomerId,
      ...scope,
    });
    if (!savedCustomer) {
      throw new BillingProviderSyncError(
        "provider_customer_identity_conflict",
        "The provider customer identity conflicts with this store account.",
        409,
      );
    }

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
    const savedSubscription = await repository.saveProviderSubscription({
      currentPeriodEnd: providerSubscription.currentPeriodEnd,
      currentPeriodStart: subscription.currentPeriodStart ?? new Date(),
      expectedStatus: subscription.status,
      observationStartedAt,
      observedAt: new Date(),
      provider: providerSubscription.provider,
      providerSubscriptionId: providerSubscription.providerSubscriptionId,
      status: localStatus,
      subscriptionId: subscription.id,
      ...scope,
    });
    if (!savedSubscription) {
      throw new BillingProviderSyncError(
        "provider_subscription_state_changed",
        "The local subscription changed while provider state was observed and requires reconciliation.",
        409,
      );
    }
    if (savedSubscription.status === "active") {
      await ports.billingRepository.activateSubscriptionSelection({
        source: "billing_selection",
        storeId: scope.storeId,
        subscriptionId: subscription.id,
        tenantId: scope.tenantId,
      });
    }

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
    metadata: { ...input, provider: "asaas" },
    outcome: input.outcome,
    requestId: context.requestId,
    storeId: context.storeId,
    tenantId: context.tenantId,
    summary: "Synchronized billing subscription with payment provider",
  });
}
