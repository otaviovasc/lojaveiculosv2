import { and, eq, isNull } from "drizzle-orm";
import { vehicleListings, vehicleUnits } from "@lojaveiculosv2/db";
import type { DocumentLinkTargetValidator } from "../../../domains/documents/ports/documentLinkTargetValidator.js";
import type { DrizzleDocumentClient } from "./drizzleDocumentRepository.js";

export function createDrizzleDocumentLinkTargetValidator(
  db: DrizzleDocumentClient,
): DocumentLinkTargetValidator {
  return {
    async existsInScope(input) {
      if (input.targetType === "store") return input.targetId === input.storeId;
      if (input.targetType === "vehicle_listing") {
        const [listing] = await db
          .select({ id: vehicleListings.id })
          .from(vehicleListings)
          .where(
            and(
              eq(vehicleListings.id, input.targetId),
              eq(vehicleListings.storeId, input.storeId),
              eq(vehicleListings.tenantId, input.tenantId),
              eq(vehicleListings.isDeleted, false),
              isNull(vehicleListings.deletedAt),
            ),
          )
          .limit(1);
        return Boolean(listing);
      }
      if (input.targetType === "vehicle_unit") {
        const [unit] = await db
          .select({ id: vehicleUnits.id })
          .from(vehicleUnits)
          .where(
            and(
              eq(vehicleUnits.id, input.targetId),
              eq(vehicleUnits.storeId, input.storeId),
              eq(vehicleUnits.tenantId, input.tenantId),
              eq(vehicleUnits.isDeleted, false),
              isNull(vehicleUnits.deletedAt),
            ),
          )
          .limit(1);
        return Boolean(unit);
      }

      return false;
    },
  };
}
