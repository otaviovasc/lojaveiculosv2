import { contactIdentityCandidates } from "@lojaveiculosv2/db";
import type { contactIdentities } from "@lojaveiculosv2/db";
import { and, eq, inArray } from "drizzle-orm";
import type {
  ContactIdentity,
  CrmCoreScope,
} from "../../../domains/crm/core/models.js";
import type { DrizzleCrmCoreClient } from "./drizzleCrmCoreRepository.js";
import { mapIdentity } from "./drizzleCrmCoreMappers.js";

type IdentityRow = typeof contactIdentities.$inferSelect;

export async function hydrateIdentityRows(
  db: DrizzleCrmCoreClient,
  scope: CrmCoreScope,
  rows: readonly IdentityRow[],
): Promise<readonly ContactIdentity[]> {
  if (rows.length === 0) return [];
  const candidateRows = await db
    .select({
      contactId: contactIdentityCandidates.contactId,
      identityId: contactIdentityCandidates.identityId,
    })
    .from(contactIdentityCandidates)
    .where(
      and(
        eq(contactIdentityCandidates.tenantId, scope.tenantId),
        eq(contactIdentityCandidates.storeId, scope.storeId),
        inArray(
          contactIdentityCandidates.identityId,
          rows.map(({ id }) => id),
        ),
      ),
    );
  const byIdentity = new Map<string, string[]>();
  for (const candidate of candidateRows) {
    const values = byIdentity.get(candidate.identityId) ?? [];
    values.push(candidate.contactId);
    byIdentity.set(candidate.identityId, values);
  }
  return rows.map((row) => mapIdentity(row, byIdentity.get(row.id) ?? []));
}
