import { randomUUID } from "node:crypto";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { BillingProviderCheckoutSessionResult } from "../../ports/billingProviderRepository.js";
import type { PaymentProviderCheckoutBillingType } from "../../ports/paymentProviderGateway.js";
import {
  assertCheckoutableAccount,
  BillingCheckoutError,
  checkoutBillingTypes,
  checkoutCallbackUrls,
  checkoutExternalReference,
  checkoutLineItems,
  toCheckoutError,
} from "../../readModels/billingCheckoutModel.js";
import {
  formatDate,
  tomorrow,
} from "../../readModels/billingProviderSyncModel.js";
import {
  getBillingProviderRepository,
  requireBillingScope,
  requireTenantBillingScope,
  type BillingServicePorts,
} from "./serviceSupport.js";

export { BillingCheckoutError };

export type CreateBillingProviderCheckoutInput = {
  billingTypes?: readonly PaymentProviderCheckoutBillingType[];
  minutesToExpire?: number;
  nextDueDate?: Date;
  returnPath: string;
};

export async function createBillingProviderCheckout(
  context: ServiceContext,
  input: CreateBillingProviderCheckoutInput,
  ports: BillingServicePorts,
): Promise<BillingProviderCheckoutSessionResult> {
  assertPermission(context, "billing.manage");
  const scope = context.storeId
    ? requireBillingScope(context)
    : { ...requireTenantBillingScope(context), storeId: null };
  const repository = getBillingProviderRepository(ports);
  const gateway = getPaymentProviderGateway(ports);
  const account = assertCheckoutableAccount(
    await repository.getProviderAccount({
      billingManagedBy: context.billingManagedBy ?? "store_owner",
      currentActorCanManage: context.permissions.includes("billing.manage"),
      ...(scope.storeId ? { storeId: scope.storeId } : {}),
      tenantId: scope.tenantId,
    }),
  );
  const callback = checkoutCallbackUrls({
    publicAppUrl: ports.publicAppUrl,
    returnPath: input.returnPath,
  });
  const externalReference = checkoutExternalReference({
    nonce: randomUUID(),
    subscriptionId: account.subscription.id,
  });
  const minutesToExpire = input.minutesToExpire ?? 60;
  const nextDueDate = formatDate(input.nextDueDate ?? tomorrow());

  context.logger.info(
    "billing.provider_checkout.create.started",
    createServiceLogMetadata(context, {
      chargeTotalCents: account.chargePreview.totalCents,
      provider: "asaas",
      subscriptionId: account.subscription.id,
    }),
  );

  try {
    const checkout = await gateway.createCheckout({
      billingTypes: checkoutBillingTypes(input.billingTypes),
      callback,
      externalReference,
      items: checkoutLineItems(account),
      minutesToExpire,
      nextDueDate,
    });
    await repository.saveProviderCheckout({
      callbackUrls: callback,
      checkoutUrl: checkout.checkoutUrl,
      expiresAt: checkout.expiresAt,
      externalReference,
      provider: checkout.provider,
      providerCheckoutId: checkout.providerCheckoutId,
      raw: checkout.raw,
      status: "created",
      storeId: scope.storeId,
      subscriptionId: account.subscription.id,
      tenantId: scope.tenantId,
    });
    await auditCheckout(context, {
      chargeTotalCents: account.chargePreview.totalCents,
      outcome: "succeeded",
      providerCheckoutId: checkout.providerCheckoutId,
      reason: null,
      subscriptionId: account.subscription.id,
    });
    return {
      checkoutUrl: checkout.checkoutUrl,
      expiresAt: checkout.expiresAt?.toISOString() ?? null,
      externalReference,
      provider: checkout.provider,
      providerCheckoutId: checkout.providerCheckoutId,
      subscriptionId: account.subscription.id,
    };
  } catch (error) {
    const checkoutError = toCheckoutError(error);
    await auditCheckout(context, {
      chargeTotalCents: account.chargePreview.totalCents,
      outcome: "failed",
      providerCheckoutId: null,
      reason: checkoutError.reason,
      subscriptionId: account.subscription.id,
    });
    throw checkoutError;
  }
}

function getPaymentProviderGateway(ports: BillingServicePorts) {
  if (!ports.paymentProviderGateway?.createCheckout) {
    throw new BillingCheckoutError(
      "missing_provider_checkout",
      "Billing payment provider checkout is not configured.",
      503,
    );
  }
  return { createCheckout: ports.paymentProviderGateway.createCheckout };
}

async function auditCheckout(
  context: ServiceContext,
  input: {
    chargeTotalCents: number;
    outcome: "failed" | "succeeded";
    providerCheckoutId: string | null;
    reason: string | null;
    subscriptionId: string;
  },
) {
  await context.audit.record({
    action: "billing.provider_checkout.create",
    actor: context.actor,
    category: "integration",
    criticality: "critical",
    entityId: input.subscriptionId,
    entityType: "billing_subscription",
    metadata: {
      chargeTotalCents: input.chargeTotalCents,
      provider: "asaas",
      providerCheckoutId: input.providerCheckoutId,
      reason: input.reason,
    },
    outcome: input.outcome,
    requestId: context.requestId,
    storeId: context.storeId,
    tenantId: context.tenantId,
    summary: "Created billing checkout with payment provider",
  });
}
