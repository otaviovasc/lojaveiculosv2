import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { BillingPlanHireRecord } from "../../ports/billingPlanHireRepository.js";
import type { PaymentProviderCheckoutBillingType } from "../../ports/paymentProviderGateway.js";
import {
  getBillingPlanHireRepository,
  requireBillingScope,
  type BillingServicePorts,
} from "./serviceSupport.js";
import { changeBillingPlanAtRenewal } from "./changeBillingPlanAtRenewal.js";
import { callbackUrls, isoDate } from "./billingPlanHireCallbacks.js";
import { createDurableBillingAuditIntent } from "./billingPlanHireAudit.js";
import { BillingPlanHireError } from "./billingPlanHireErrors.js";
import { missingBillingCustomerFields } from "./billingCustomerDataRequirements.js";

export { BillingPlanHireError } from "./billingPlanHireErrors.js";

export type CreateBillingPlanHireInput = {
  billingTypes?: readonly PaymentProviderCheckoutBillingType[];
  idempotencyKey: string;
  planId: string;
  quoteId?: string;
  returnPath?: string;
};

export async function createBillingPlanHire(
  context: ServiceContext,
  input: CreateBillingPlanHireInput,
  ports: BillingServicePorts,
): Promise<BillingPlanHireRecord> {
  assertPermission(context, "billing.manage");
  const scope = requireBillingScope(context);
  const repository = getBillingPlanHireRepository(ports);
  const audit = createDurableBillingAuditIntent(context);
  const prepared = await repository.prepareHire({
    actorId: context.actor.id,
    audit,
    billingTypes: input.billingTypes ?? ["CREDIT_CARD", "PIX"],
    idempotencyKey: input.idempotencyKey,
    planId: input.planId,
    requestId: context.requestId,
    ...(input.quoteId ? { quoteId: input.quoteId } : {}),
    ...scope,
  });

  if (prepared.created) {
    context.logger.info(
      "billing.plan_hire.created",
      createServiceLogMetadata(context, {
        checkoutMode: prepared.hire.checkoutMode,
        hireId: prepared.hire.id,
        planId: prepared.hire.planId,
        quotedCents: prepared.hire.quotedCents,
      }),
    );
  }

  if (
    prepared.hire.status !== "created" &&
    prepared.hire.status !== "payment_pending"
  ) {
    return prepared.hire;
  }
  const gateway = ports.paymentProviderGateway;
  const status = await gateway?.getProviderStatus();
  if (!gateway || !status?.configured || !status.webhookConfigured) {
    await repository.failHire({
      failureCode: "provider_unavailable",
      hireId: prepared.hire.id,
      ...scope,
    });
    throw new BillingPlanHireError(
      "BILLING_PROVIDER_UNAVAILABLE",
      "Checkout is unavailable until Asaas and its webhook are configured.",
    );
  }

  if (prepared.providerTransition) {
    const request = await repository.beginCheckoutRequest({
      hireId: prepared.hire.id,
      requestId: context.requestId,
      ...scope,
    });
    if (!request.claimed) return request.hire;
    return changeBillingPlanAtRenewal(
      context,
      { ...prepared, hire: request.hire },
      repository,
      gateway,
      scope,
    );
  }
  if (!gateway.createCheckout) {
    await repository.failHire({
      failureCode: "provider_checkout_unavailable",
      hireId: prepared.hire.id,
      ...scope,
    });
    throw new BillingPlanHireError(
      "BILLING_PROVIDER_UNAVAILABLE",
      "Provider checkout is unavailable.",
    );
  }

  const request = await repository.beginCheckoutRequest({
    hireId: prepared.hire.id,
    requestId: context.requestId,
    ...scope,
  });
  if (!request.claimed) return request.hire;

  const missingFields = missingBillingCustomerFields(prepared.customerData);
  if (missingFields.length > 0) {
    await repository.failHire({
      failureCode: "customer_data_incomplete",
      hireId: request.hire.id,
      ...scope,
    });
    throw new BillingPlanHireError(
      "BILLING_CUSTOMER_DATA_INCOMPLETE",
      "Store billing data is incomplete.",
      { missingFields },
    );
  }

  const callback = callbackUrls(
    ports.publicAppUrl,
    input.returnPath ?? "/billing",
    request.hire.id,
  );
  let checkout;
  try {
    checkout = await gateway.createCheckout({
      billingTypes: prepared.billingTypes,
      callback,
      ...(prepared.customerData ? { customerData: prepared.customerData } : {}),
      externalReference: request.hire.id,
      items: [
        {
          description: `Plano ${request.hire.planSnapshot.name}`,
          name: request.hire.planSnapshot.name,
          quantity: 1,
          valueCents: request.hire.quotedCents,
        },
      ],
      minutesToExpire: 60,
      nextDueDate: isoDate(new Date()),
    });
  } catch (error) {
    context.logger.warn(
      "billing.plan_hire.checkout_failed",
      createServiceLogMetadata(context, {
        hireId: request.hire.id,
        reason: error instanceof Error ? error.message : "unknown",
      }),
    );
    await repository.failHire({
      failureCode: "provider_checkout_failed",
      hireId: request.hire.id,
      ...scope,
    });
    throw new BillingPlanHireError(
      "BILLING_PROVIDER_CHECKOUT_FAILED",
      "The payment provider rejected the checkout. Review the store billing data and try again.",
    );
  }
  const hire = await repository.bindCheckout({
    audit,
    callbackUrls: callback,
    checkoutUrl: checkout.checkoutUrl,
    expiresAt: checkout.expiresAt,
    hireId: request.hire.id,
    providerCheckoutId: checkout.providerCheckoutId,
    raw: {
      externalReference: checkout.externalReference,
      providerCheckoutId: checkout.providerCheckoutId,
    },
    requestId: context.requestId,
    ...scope,
  });
  context.logger.info(
    "billing.plan_hire.checkout_created",
    createServiceLogMetadata(context, {
      hireId: hire.id,
      providerCheckoutId: hire.providerCheckoutId,
    }),
  );
  return hire;
}
