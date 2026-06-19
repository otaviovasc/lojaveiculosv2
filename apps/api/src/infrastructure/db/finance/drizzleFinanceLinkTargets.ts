import { and, eq } from "drizzle-orm";
import {
  documents,
  leads,
  salePayments,
  sales,
  vehicleCosts,
  vehicleListings,
  vehicleUnits,
} from "@lojaveiculosv2/db";
import type { FinanceLinkTarget } from "../../../domains/finance/ports/financeRepository.js";
import type { DrizzleFinanceClient } from "./drizzleFinanceRepository.js";

export type FinanceLinkTargetInput = {
  targetId: string;
  targetType: FinanceLinkTarget;
};

export async function validateFinanceLinkTargets(
  db: DrizzleFinanceClient,
  input: {
    links: readonly FinanceLinkTargetInput[];
    storeId: string;
    tenantId: string;
  },
): Promise<void> {
  for (const link of input.links) {
    const exists = await targetExists(db, {
      ...link,
      storeId: input.storeId,
      tenantId: input.tenantId,
    });
    if (!exists) throw new FinanceLinkTargetNotFoundError(link);
  }
}

async function targetExists(
  db: DrizzleFinanceClient,
  input: FinanceLinkTargetInput & { storeId: string; tenantId: string },
): Promise<boolean> {
  const table = tableForTarget(input.targetType);
  const [row] = await db
    .select({ id: table.id })
    .from(table)
    .where(
      and(
        eq(table.id, input.targetId),
        eq(table.storeId, input.storeId),
        eq(table.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

function tableForTarget(targetType: FinanceLinkTarget) {
  switch (targetType) {
    case "document":
      return documents;
    case "lead":
      return leads;
    case "sale":
      return sales;
    case "sale_payment":
      return salePayments;
    case "vehicle_cost":
      return vehicleCosts;
    case "vehicle_listing":
      return vehicleListings;
    case "vehicle_unit":
      return vehicleUnits;
  }
}

export class FinanceLinkTargetNotFoundError extends Error {
  constructor(link: FinanceLinkTargetInput) {
    super(`Finance link target not found: ${link.targetType}:${link.targetId}`);
    this.name = "FinanceLinkTargetNotFoundError";
  }
}
