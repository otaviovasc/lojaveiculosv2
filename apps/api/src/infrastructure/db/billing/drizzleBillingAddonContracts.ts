import { and, desc, eq } from "drizzle-orm";
import { addons, billingAddonContracts } from "@lojaveiculosv2/db";
import type { BillingAddonContract } from "../../../domains/billing/ports/billingRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { toContract } from "./drizzleBillingAddonContractSupport.js";

export * from "./drizzleBillingAddonContractActivation.js";
export * from "./drizzleBillingAddonContractLifecycle.js";
export * from "./drizzleBillingAddonContractProvisioning.js";

export async function listAddonContracts(
  db: DrizzleBillingClient,
  input: { storeId?: string; tenantId: string },
): Promise<BillingAddonContract[]> {
  const rows = await db
    .select({ addon: addons, contract: billingAddonContracts })
    .from(billingAddonContracts)
    .innerJoin(addons, eq(addons.id, billingAddonContracts.addonId))
    .where(
      input.storeId
        ? and(
            eq(billingAddonContracts.tenantId, input.tenantId),
            eq(billingAddonContracts.storeId, input.storeId),
          )
        : eq(billingAddonContracts.tenantId, input.tenantId),
    )
    .orderBy(desc(billingAddonContracts.createdAt))
    .limit(100);
  return rows.map(({ addon, contract }) => toContract(contract, addon));
}
