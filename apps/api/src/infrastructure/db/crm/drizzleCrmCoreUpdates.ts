import { and, eq, sql } from "drizzle-orm";
import {
  contactIdentities,
  contactIdentityCandidates,
  contacts,
  consentReceipts,
  conversationThreads,
  factProposals,
  opportunities,
  crmChannelConnections,
} from "@lojaveiculosv2/db";
import type {
  CrmCoreEntityByResource,
  CrmCoreResource,
  CrmCoreScope,
  CreateCrmCoreEntity,
} from "../../../domains/crm/core/models.js";
import type { DrizzleCrmCoreClient } from "./drizzleCrmCoreRepository.js";
import { getDrizzleCrmCore } from "./drizzleCrmCoreReads.js";

export async function updateDrizzleCrmCore<R extends CrmCoreResource>(
  db: DrizzleCrmCoreClient,
  input: CrmCoreScope & {
    expectedRevision: number;
    id: string;
    patch: Partial<CreateCrmCoreEntity<R>>;
    resource: R;
  },
): Promise<CrmCoreEntityByResource[R] | null> {
  const changed = await updateRow(db, input);
  if (!changed) return null;
  return getDrizzleCrmCore(db, input);
}

async function updateRow<R extends CrmCoreResource>(
  db: DrizzleCrmCoreClient,
  input: CrmCoreScope & {
    expectedRevision: number;
    id: string;
    patch: Partial<CreateCrmCoreEntity<R>>;
    resource: R;
  },
): Promise<boolean> {
  const revision = (column: unknown) => sql`${column} + 1`;
  switch (input.resource) {
    case "contacts": {
      const patch = input.patch as Partial<CreateCrmCoreEntity<"contacts">>;
      const rows = await db
        .update(contacts)
        .set({
          ...(patch.displayName !== undefined
            ? { displayName: patch.displayName }
            : {}),
          ...(patch.mergedIntoContactId !== undefined
            ? { mergedIntoContactId: patch.mergedIntoContactId }
            : {}),
          revision: revision(contacts.revision),
          updatedAt: new Date(),
        })
        .where(scopedRevision(contacts, input))
        .returning({ id: contacts.id });
      return rows.length === 1;
    }
    case "contact-identities": {
      const patch = input.patch as Partial<
        CreateCrmCoreEntity<"contact-identities">
      >;
      return db.transaction(async (tx) => {
        const rows = await tx
          .update(contactIdentities)
          .set({
            ...(patch.contactId !== undefined
              ? { contactId: patch.contactId }
              : {}),
            ...(patch.verification !== undefined
              ? {
                  state: patch.verification,
                  verifiedAt:
                    patch.verification === "verified" ? new Date() : null,
                }
              : {}),
            revision: revision(contactIdentities.revision),
            updatedAt: new Date(),
          })
          .where(scopedRevision(contactIdentities, input))
          .returning({ id: contactIdentities.id });
        if (rows.length !== 1) return false;
        if (patch.candidateContactIds !== undefined) {
          await tx
            .delete(contactIdentityCandidates)
            .where(
              and(
                eq(contactIdentityCandidates.tenantId, input.tenantId),
                eq(contactIdentityCandidates.storeId, input.storeId),
                eq(contactIdentityCandidates.identityId, input.id),
              ),
            );
          const candidateContactIds = [...new Set(patch.candidateContactIds)];
          if (candidateContactIds.length > 0) {
            await tx.insert(contactIdentityCandidates).values(
              candidateContactIds.map((contactId) => ({
                contactId,
                identityId: input.id,
                storeId: input.storeId,
                tenantId: input.tenantId,
              })),
            );
          }
        }
        return true;
      });
    }
    case "opportunities": {
      const patch = input.patch as Partial<
        CreateCrmCoreEntity<"opportunities">
      >;
      const metadataPatch = opportunityMetadataPatch(patch);
      const rows = await db
        .update(opportunities)
        .set({
          ...(patch.status !== undefined ? { state: patch.status } : {}),
          ...(Object.keys(metadataPatch).length > 0
            ? {
                metadata: sql`coalesce(${opportunities.metadata}, '{}'::jsonb) || ${JSON.stringify(metadataPatch)}::jsonb`,
              }
            : {}),
          revision: revision(opportunities.revision),
          updatedAt: new Date(),
        })
        .where(scopedRevision(opportunities, input))
        .returning({ id: opportunities.id });
      return rows.length === 1;
    }
    case "conversations": {
      const patch = input.patch as Partial<
        CreateCrmCoreEntity<"conversations">
      >;
      if (patch.attendanceState !== undefined) {
        throw new Error(
          "CRM attendance mutations must use the canonical conversation writer.",
        );
      }
      const rows = await db
        .update(conversationThreads)
        .set({
          ...(patch.threadState !== undefined
            ? { state: patch.threadState }
            : {}),
          ...(patch.unreadCount !== undefined ||
          patch.pipelineId !== undefined ||
          patch.pipelineStageId !== undefined
            ? {
                metadata: {
                  ...(patch.unreadCount !== undefined
                    ? { unreadCount: patch.unreadCount }
                    : {}),
                  ...(patch.pipelineId !== undefined
                    ? { pipelineId: patch.pipelineId }
                    : {}),
                  ...(patch.pipelineStageId !== undefined
                    ? { pipelineStageId: patch.pipelineStageId }
                    : {}),
                },
              }
            : {}),
          revision: revision(conversationThreads.revision),
          updatedAt: new Date(),
        })
        .where(scopedRevision(conversationThreads, input))
        .returning({ id: conversationThreads.id });
      return rows.length === 1;
    }
    case "connections":
      return updateProjectionRow(db, crmChannelConnections, input);
    case "consents":
      return updateProjectionRow(db, consentReceipts, input);
    case "fact-proposals":
      return updateProjectionRow(db, factProposals, input);
  }
}

export function opportunityMetadataPatch(
  patch: Partial<CreateCrmCoreEntity<"opportunities">>,
): Record<string, unknown> {
  return {
    ...(patch.interests !== undefined ? { interests: patch.interests } : {}),
    ...(patch.pipelineId !== undefined ? { pipelineId: patch.pipelineId } : {}),
    ...(patch.pipelineStageId !== undefined
      ? { pipelineStageId: patch.pipelineStageId }
      : {}),
  };
}

function scopedRevision(
  table: {
    id: unknown;
    revision: unknown;
    storeId: unknown;
    tenantId: unknown;
  },
  input: CrmCoreScope & { expectedRevision: number; id: string },
) {
  return and(
    eq(table.id as never, input.id),
    eq(table.revision as never, input.expectedRevision),
    eq(table.storeId as never, input.storeId),
    eq(table.tenantId as never, input.tenantId),
  );
}

async function updateProjectionRow(
  db: DrizzleCrmCoreClient,
  table:
    | typeof crmChannelConnections
    | typeof consentReceipts
    | typeof factProposals,
  input: CrmCoreScope & { expectedRevision: number; id: string },
): Promise<boolean> {
  const rows = await db
    .update(table)
    .set({
      revision: sql`${table.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(scopedRevision(table, input))
    .returning({ id: table.id });
  return rows.length === 1;
}
