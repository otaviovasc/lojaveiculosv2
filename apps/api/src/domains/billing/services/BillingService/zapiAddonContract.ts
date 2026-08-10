import type { StoreId } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import {
  BillingAddonContractError,
  type BillingAddonContract,
} from "../../ports/billingRepository.js";
import type { BillingServicePorts } from "./serviceSupport.js";
import { requireBillingScope } from "./serviceSupport.js";
import {
  requireAddonContractRepository,
  resolveAddonContractStoreScope,
} from "../../billingAddonContractSupport.js";
import { syncBillingProviderSubscription } from "./syncBillingProviderSubscription.js";
import { updateBillingSelection } from "./updateBillingSelection.js";

export async function updateAgencyBillingSelection(
  context: ServiceContext,
  input: { addonIds: readonly string[]; planId: string; storeId: StoreId },
  ports: BillingServicePorts,
) {
  assertPermission(context, "billing.manage");
  logContractAction(context, "agency_selection.started");
  const scope = await resolveAddonContractStoreScope(
    context,
    { storeId: input.storeId },
    ports,
  );
  return updateBillingSelection(
    { ...context, storeId: scope.storeId, tenantId: scope.tenantId },
    { addonIds: input.addonIds, planId: input.planId },
    ports,
  );
}

export async function requestZapiAddon(
  context: ServiceContext,
  input: { storeId?: StoreId },
  ports: BillingServicePorts,
): Promise<BillingAddonContract> {
  assertPermission(context, "billing.manage");
  logContractAction(context, "request.started");
  const repository = requireAddonContractRepository(ports);
  const scope = await resolveAddonContractStoreScope(context, input, ports);
  const overview = await ports.billingRepository.getOverview({
    billingManagedBy: context.billingManagedBy ?? "store_owner",
    currentActorCanManage: true,
    ...scope,
  });
  const subscription = overview.subscription;
  const addon = overview.addons.find(
    (candidate) =>
      candidate.code === "crm_zapi" && candidate.status === "active",
  );
  const crm = overview.entitlements.find(
    (entitlement) =>
      entitlement.featureKey === "crm" &&
      (entitlement.status === "active" || entitlement.status === "trialing"),
  );
  if (!subscription?.currentPeriodEnd || subscription.status !== "active") {
    throw new BillingAddonContractError(
      "Z-API requires an active monthly subscription with a renewal date.",
    );
  }
  if (!crm) {
    throw new BillingAddonContractError(
      "Z-API requires an active CRM subscription.",
    );
  }
  if (!addon) {
    throw new BillingAddonContractError(
      "Z-API is unavailable in this catalog.",
    );
  }

  const pending = await repository.requestZapiAddon({
    addonId: addon.id,
    scheduledFor: subscription.currentPeriodEnd,
    ...scope,
  });
  if (pending.status !== "pending") return pending;

  const syncContext =
    context.billingManagedBy === "agency" && !context.storeId
      ? context
      : { ...context, storeId: scope.storeId, tenantId: scope.tenantId };
  const providerSync = await syncBillingProviderSubscription(
    syncContext,
    {
      nextDueDate: subscription.currentPeriodEnd,
      updatePendingPayments: false,
      zapiLifecycleSync: true,
    },
    ports,
  );
  const scheduled = await repository.markZapiAddonScheduled({
    contractId: pending.id,
    expectedRenewalAmountCents: providerSync.chargeTotalCents,
    ...scope,
  });
  await auditContract(context, scheduled, "billing.addon.zapi.request");
  return scheduled;
}

export async function cancelZapiAddon(
  context: ServiceContext,
  input: { storeId?: StoreId },
  ports: BillingServicePorts,
): Promise<BillingAddonContract> {
  assertPermission(context, "billing.manage");
  logContractAction(context, "cancellation.started");
  const repository = requireAddonContractRepository(ports);
  const scope = await resolveAddonContractStoreScope(context, input, ports);
  const overview = await ports.billingRepository.getOverview({
    billingManagedBy: context.billingManagedBy ?? "store_owner",
    currentActorCanManage: true,
    ...scope,
  });
  const renewal = overview.subscription?.currentPeriodEnd;
  if (!renewal)
    throw new BillingAddonContractError("Renewal date was not found.");
  await repository.cancelZapiAddon({
    effectiveAt: renewal,
    ...scope,
  });
  const syncContext =
    context.billingManagedBy === "agency" && !context.storeId
      ? context
      : { ...context, storeId: scope.storeId, tenantId: scope.tenantId };
  await syncBillingProviderSubscription(
    syncContext,
    {
      nextDueDate: renewal,
      updatePendingPayments: false,
      zapiLifecycleSync: true,
    },
    ports,
  );
  const confirmed = await repository.confirmZapiAddonCancellationSync(scope);
  await auditContract(context, confirmed, "billing.addon.zapi.cancel");
  return confirmed;
}

export async function completeZapiAddonSetup(
  context: ServiceContext,
  input: { connectionId: string },
  ports: BillingServicePorts,
): Promise<BillingAddonContract> {
  assertPermission(context, "crm.whatsapp.integrations.manage");
  logContractAction(context, "setup_completion.started");
  const repository = requireAddonContractRepository(ports);
  const scope = requireBillingScope(context);
  const contract = await repository.completeZapiAddonSetup({
    ...input,
    ...scope,
  });
  await auditContract(context, contract, "billing.addon.zapi.setup_complete");
  return contract;
}

function logContractAction(context: ServiceContext, action: string) {
  context.logger.info(
    `billing.addon.zapi.${action}`,
    createServiceLogMetadata(context),
  );
}

async function auditContract(
  context: ServiceContext,
  contract: BillingAddonContract,
  action: string,
) {
  await context.audit.record({
    action,
    actor: context.actor,
    category: "data_change",
    criticality: "critical",
    entityId: contract.id,
    entityType: "billing_addon_contract",
    metadata: {
      addonCode: contract.addonCode,
      setupConnectionId: contract.setupConnectionId,
      scheduledFor: contract.scheduledFor?.toISOString() ?? null,
      status: contract.status,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: contract.storeId,
    tenantId: context.tenantId,
    summary: "Updated Z-API billing contract",
  });
}
