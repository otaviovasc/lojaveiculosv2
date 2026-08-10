import { and, desc, eq, ne } from "drizzle-orm";
import { addons, billingAddonContracts } from "@lojaveiculosv2/db";
import {
  BillingAddonContractError,
  type BillingAddonContract,
} from "../../../domains/billing/ports/billingRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function findOpenContract(
  db: DrizzleBillingClient,
  input: { storeId: string; tenantId: string },
) {
  const [row] = await db
    .select({ addon: addons, contract: billingAddonContracts })
    .from(billingAddonContracts)
    .innerJoin(addons, eq(addons.id, billingAddonContracts.addonId))
    .where(
      and(
        eq(billingAddonContracts.storeId, input.storeId),
        eq(billingAddonContracts.tenantId, input.tenantId),
        eq(addons.code, "crm_zapi"),
        ne(billingAddonContracts.status, "cancelled"),
      ),
    )
    .orderBy(desc(billingAddonContracts.createdAt))
    .limit(1);
  return row ? toContract(row.contract, row.addon) : null;
}

export async function requireOpenContract(
  db: DrizzleBillingClient,
  input: { storeId: string; tenantId: string },
) {
  const contract = await findOpenContract(db, input);
  if (!contract)
    throw new BillingAddonContractError("Z-API contract was not found.");
  return contract;
}

export async function contractByRow(
  db: DrizzleBillingClient,
  row: typeof billingAddonContracts.$inferSelect,
) {
  const [addon] = await db
    .select()
    .from(addons)
    .where(eq(addons.id, row.addonId))
    .limit(1);
  if (!addon) throw new Error("Billing add-on catalog row was not found.");
  return toContract(row, addon);
}

export function toContract(
  contract: typeof billingAddonContracts.$inferSelect,
  addon: typeof addons.$inferSelect,
): BillingAddonContract {
  return {
    addonCode: addon.code,
    cancellationScheduledFor: contract.cancellationScheduledFor,
    id: contract.id,
    monthlyPriceCents: addon.monthlyPriceCents,
    paidAt: contract.paidAt,
    scheduledFor: contract.scheduledFor,
    setupCompletedAt: contract.setupCompletedAt,
    setupConnectionId: contract.setupConnectionId,
    status: contract.status,
    storeId: contract.storeId as never,
    supportCode: contract.supportCode,
  };
}

export function billingDate(value: Date) {
  return value.toISOString().slice(0, 10);
}
