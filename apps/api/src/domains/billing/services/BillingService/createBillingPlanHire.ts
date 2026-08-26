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
import { auditBillingPlanHire } from "./billingPlanHireAudit.js";
import { callbackUrls, isoDate } from "./billingPlanHireCallbacks.js";
import { BillingPlanHireError } from "./billingPlanHireErrors.js";

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
  const prepared = await repository.prepareHire({
    actorId: context.actor.id,
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
    await auditBillingPlanHire(
      context,
      prepared.hire,
      "billing.plan_hire.created",
    );
  }

  if (!prepared.created || prepared.hire.status === "paid_active") {
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
    return changeBillingPlanAtRenewal(
      context,
      prepared,
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

  const callback = callbackUrls(
    ports.publicAppUrl,
    input.returnPath ?? "/billing",
    prepared.hire.id,
  );
  try {
    const checkout = await gateway.createCheckout({
      billingTypes: prepared.billingTypes,
      callback,
      ...(prepared.customerData ? { customerData: prepared.customerData } : {}),
      externalReference: prepared.hire.id,
      items: [
        {
          description: `Plano ${prepared.hire.planSnapshot.name}`,
          name: prepared.hire.planSnapshot.name,
          quantity: 1,
          valueCents: prepared.hire.quotedCents,
        },
      ],
      minutesToExpire: 60,
      nextDueDate: isoDate(new Date()),
    });
    const hire = await repository.bindCheckout({
      callbackUrls: callback,
      checkoutUrl: checkout.checkoutUrl,
      expiresAt: checkout.expiresAt,
      hireId: prepared.hire.id,
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
    await auditBillingPlanHire(
      context,
      hire,
      "billing.plan_hire.checkout_created",
    );
    return hire;
  } catch (error) {
    await repository.failHire({
      failureCode: "checkout_creation_failed",
      hireId: prepared.hire.id,
      ...scope,
    });
    throw error;
  }
}
