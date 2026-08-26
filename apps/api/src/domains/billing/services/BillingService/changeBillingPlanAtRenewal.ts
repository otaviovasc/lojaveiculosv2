import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  BillingPlanHireRecord,
  BillingPlanHireRepository,
} from "../../ports/billingPlanHireRepository.js";
import { customerExternalReference } from "../../readModels/billingProviderSyncModel.js";
import type {
  requireBillingScope,
  BillingServicePorts,
} from "./serviceSupport.js";
import { BillingPlanHireError } from "./billingPlanHireErrors.js";
import { auditBillingPlanHire } from "./billingPlanHireAudit.js";
import { isoDate } from "./billingPlanHireCallbacks.js";

export async function changeBillingPlanAtRenewal(
  context: ServiceContext,
  prepared: Awaited<ReturnType<BillingPlanHireRepository["prepareHire"]>>,
  repository: BillingPlanHireRepository,
  gateway: NonNullable<BillingServicePorts["paymentProviderGateway"]>,
  scope: ReturnType<typeof requireBillingScope>,
): Promise<BillingPlanHireRecord> {
  const transition = prepared.providerTransition;
  if (!transition?.providerSubscriptionId) {
    await repository.failHire({
      failureCode: "provider_subscription_identity_missing",
      hireId: prepared.hire.id,
      ...scope,
    });
    throw new BillingPlanHireError(
      "BILLING_RECONCILIATION_REQUIRED",
      "The current paid contract must be reconciled before changing plans.",
    );
  }

  try {
    if (prepared.hire.checkoutMode === "free") {
      if (!gateway.cancelSubscription) {
        throw new BillingPlanHireError(
          "BILLING_PROVIDER_UNAVAILABLE",
          "Provider subscription cancellation is unavailable.",
        );
      }
      await gateway.cancelSubscription(transition.providerSubscriptionId);
      const hire = await repository.scheduleFreeDowngrade({
        effectiveAt: transition.effectiveAt,
        hireId: prepared.hire.id,
        ...scope,
      });
      await auditBillingPlanHire(
        context,
        hire,
        "billing.plan_hire.downgrade_scheduled",
      );
      return hire;
    }

    if (!gateway.syncCustomer || !gateway.syncSubscription) {
      throw new BillingPlanHireError(
        "BILLING_PROVIDER_UNAVAILABLE",
        "Provider subscription updates are unavailable.",
      );
    }
    const customerData = prepared.customerData;
    if (!customerData) {
      throw new BillingPlanHireError(
        "BILLING_RECONCILIATION_REQUIRED",
        "The billing customer must be reconciled before changing plans.",
      );
    }
    const customer = await gateway.syncCustomer({
      documentNumber: customerData.cpfCnpj,
      email: customerData.email,
      existingProviderCustomerId: transition.providerCustomerId,
      externalReference: customerExternalReference(scope.tenantId),
      name: customerData.name,
    });
    const providerSubscription = await gateway.syncSubscription({
      billingType: prepared.billingTypes.includes("CREDIT_CARD")
        ? "CREDIT_CARD"
        : "PIX",
      customerId: customer.providerCustomerId,
      description: `Plano ${prepared.hire.planSnapshot.name}`,
      existingProviderSubscriptionId: transition.providerSubscriptionId,
      externalReference: prepared.hire.id,
      nextDueDate: isoDate(transition.effectiveAt),
      updatePendingPayments: false,
      valueCents: prepared.hire.quotedCents,
    });
    const hire = await repository.bindRenewal({
      effectiveAt: transition.effectiveAt,
      hireId: prepared.hire.id,
      providerSubscriptionId: providerSubscription.providerSubscriptionId,
      ...scope,
    });
    await auditBillingPlanHire(
      context,
      hire,
      "billing.plan_hire.renewal_change_scheduled",
    );
    return hire;
  } catch (error) {
    await repository.failHire({
      failureCode: "provider_renewal_change_failed",
      hireId: prepared.hire.id,
      ...scope,
    });
    throw error;
  }
}
