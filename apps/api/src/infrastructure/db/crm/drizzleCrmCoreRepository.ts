import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { contactIdentities } from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import { CrmCoreRevisionConflictError } from "../../../domains/crm/core/errors.js";
import type { CrmCoreRepository } from "../../../domains/crm/ports/crmCoreRepository.js";
import { hydrateIdentityRows } from "./drizzleCrmIdentityCandidates.js";
import {
  getDrizzleCrmCore,
  listDrizzleCrmCore,
} from "./drizzleCrmCoreReads.js";
import { updateDrizzleCrmCore } from "./drizzleCrmCoreUpdates.js";
import { createDrizzleCrmCore } from "./drizzleCrmCoreWrites.js";

export type DrizzleCrmCoreClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleCrmCoreRepository(
  db: DrizzleCrmCoreClient,
): CrmCoreRepository {
  return {
    create: (input) => createDrizzleCrmCore(db, input),
    async findIdentityByNormalizedValue(input) {
      const rows = await db
        .select()
        .from(contactIdentities)
        .where(
          and(
            eq(contactIdentities.tenantId, input.tenantId),
            eq(contactIdentities.storeId, input.storeId),
            eq(contactIdentities.identityKind, input.kind),
            eq(contactIdentities.normalizedValue, input.normalizedValue),
          ),
        );
      return hydrateIdentityRows(db, input, rows);
    },
    get: (input) => getDrizzleCrmCore(db, input),
    list: (input) => listDrizzleCrmCore(db, input),
    async update(input) {
      const updated = await updateDrizzleCrmCore(db, input);
      if (updated) return updated;
      const current = await getDrizzleCrmCore(db, input);
      if (current) {
        throw new CrmCoreRevisionConflictError(
          input.expectedRevision,
          current.revision,
        );
      }
      return null;
    },
  };
}
