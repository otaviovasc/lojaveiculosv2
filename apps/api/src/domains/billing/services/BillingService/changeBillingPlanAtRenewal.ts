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
  if (!transition) {
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

  if (prepared.hire.checkoutMode === "free") {
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

  const cancellation = await repository.supersedeFreeDowngrade({
    effectiveAt: transition.effectiveAt,
    hireId: prepared.hire.id,
    ...scope,
  });
  let hire: BillingPlanHireRecord;
  try {
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
      ...(canReuseProviderSubscription(cancellation.state) &&
      transition.providerSubscriptionId
        ? {
            existingProviderSubscriptionId: transition.providerSubscriptionId,
          }
        : {}),
      externalReference: prepared.hire.id,
      nextDueDate: isoDate(transition.effectiveAt),
      updatePendingPayments: false,
      valueCents: prepared.hire.quotedCents,
    });
    hire = await repository.bindRenewal({
      effectiveAt: transition.effectiveAt,
      hireId: prepared.hire.id,
      providerSubscriptionId: providerSubscription.providerSubscriptionId,
      ...scope,
    });
  } catch (error) {
    let restorationError: unknown;
    if (cancellation.state === "revoked" && transition.providerSubscriptionId) {
      try {
        await repository.restoreFreeDowngradeCancellation({
          hireId: prepared.hire.id,
          providerSubscriptionId: transition.providerSubscriptionId,
          ...scope,
        });
      } catch (restoreError) {
        restorationError = restoreError;
      }
    }
    await repository.failHire({
      failureCode: "provider_renewal_change_failed",
      hireId: prepared.hire.id,
      ...scope,
    });
    if (restorationError) throw restorationError;
    throw error;
  }
  await auditBillingPlanHire(
    context,
    hire,
    "billing.plan_hire.renewal_change_scheduled",
  );
  return hire;
}

function canReuseProviderSubscription(
  state: Awaited<
    ReturnType<BillingPlanHireRepository["supersedeFreeDowngrade"]>
  >["state"],
) {
  return state === "none" || state === "revoked";
}
