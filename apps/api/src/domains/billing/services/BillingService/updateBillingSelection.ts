import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { BillingOverview } from "../../ports/billingRepository.js";
import {
  requireBillingScope,
  type BillingServicePorts,
} from "./serviceSupport.js";

export class BillingSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingSelectionError";
  }
}

export async function updateBillingSelection(
  context: ServiceContext,
  input: { addonIds: readonly string[]; planId: string },
  ports: BillingServicePorts,
): Promise<BillingOverview> {
  assertPermission(context, "billing.manage");
  const scope = requireBillingScope(context);
  const before = await ports.billingRepository.getOverview({
    billingManagedBy: context.billingManagedBy ?? "store_owner",
    currentActorCanManage: true,
    ...scope,
  });
  const plan = before.plans.find(
    (candidate) =>
      candidate.id === input.planId && candidate.status === "active",
  );
  if (!plan) throw new BillingSelectionError("Selected plan is unavailable.");
  const uniqueAddonIds = [...new Set(input.addonIds)];
  const selectedAddons = uniqueAddonIds.map((addonId) =>
    before.addons.find(
      (candidate) =>
        candidate.id === addonId &&
        candidate.status === "active" &&
        candidate.catalogVersion === plan.catalogVersion,
    ),
  );
  if (selectedAddons.some((addon) => !addon)) {
    throw new BillingSelectionError("Selected add-on is unavailable.");
  }
  const featureKeys = new Set<string>();
  for (const addon of selectedAddons) {
    if (!addon) continue;
    if (
      plan.features.some(
        (feature) =>
          feature.included && feature.featureKey === addon.featureKey,
      )
    ) {
      throw new BillingSelectionError(
        "Selected add-on is already included in the plan.",
      );
    }
    if (featureKeys.has(addon.featureKey)) {
      throw new BillingSelectionError(
        "More than one add-on grants the same feature.",
      );
    }
    featureKeys.add(addon.featureKey);
  }

  context.logger.info(
    "billing.subscription.selection.update.started",
    createServiceLogMetadata(context, {
      addonCount: uniqueAddonIds.length,
      catalogVersion: plan.catalogVersion,
      planCode: plan.code,
    }),
  );

  const overview = await ports.billingRepository.updateSubscriptionSelection({
    addonIds: uniqueAddonIds,
    billingManagedBy: context.billingManagedBy ?? "store_owner",
    currentActorCanManage: true,
    planId: plan.id,
    ...scope,
  });
  await context.audit.record({
    action: "billing.subscription.selection.update",
    actor: context.actor,
    category: "data_change",
    criticality: "critical",
    entityId: overview.subscription?.id ?? scope.storeId,
    entityType: "billing_subscription",
    metadata: {
      addonCount: uniqueAddonIds.length,
      catalogVersion: plan.catalogVersion,
      planCode: plan.code,
      previewTotalCents: overview.chargePreview.totalCents,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Updated billing plan and add-on selection",
  });
  return overview;
}
