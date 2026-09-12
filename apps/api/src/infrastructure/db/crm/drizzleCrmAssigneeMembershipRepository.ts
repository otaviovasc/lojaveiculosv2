import { storeMemberships, users } from "@lojaveiculosv2/db";
import { and, eq } from "drizzle-orm";
import type { CrmAssigneeMembershipRepository } from "../../../domains/crm/ports/crmAssigneeMembershipRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export function createDrizzleCrmAssigneeMembershipRepository(
  db: DrizzleCrmClient,
): CrmAssigneeMembershipRepository {
  return {
    async isActiveStoreMember(input) {
      const [membership] = await db
        .select({ id: storeMemberships.id })
        .from(storeMemberships)
        .innerJoin(users, eq(users.id, storeMemberships.userId))
        .where(
          and(
            eq(storeMemberships.tenantId, input.tenantId),
            eq(storeMemberships.storeId, input.storeId),
            eq(storeMemberships.userId, input.userId),
            eq(storeMemberships.status, "active"),
            eq(users.tenantId, input.tenantId),
            eq(users.isDeleted, false),
          ),
        )
        .limit(1);
      return Boolean(membership);
    },
  };
}
