import { and, asc, eq, gt, or } from "drizzle-orm";
import {
  contactIdentities,
  contacts,
  consentReceipts,
  conversationAttendances,
  conversationThreads,
  factProposals,
  opportunities,
  providerConnections,
} from "@lojaveiculosv2/db";
import type {
  CrmCoreEntityByResource,
  CrmCoreResource,
  CrmCoreScope,
} from "../../../domains/crm/core/models.js";
import type { DrizzleCrmCoreClient } from "./drizzleCrmCoreRepository.js";
import {
  mapConnection,
  mapConsent,
  mapContact,
  mapConversation,
  mapFactProposal,
  mapOpportunity,
} from "./drizzleCrmCoreMappers.js";
import { hydrateIdentityRows } from "./drizzleCrmIdentityCandidates.js";

export async function listDrizzleCrmCore<R extends CrmCoreResource>(
  db: DrizzleCrmCoreClient,
  input: CrmCoreScope & {
    cursor?: { createdAt: Date; id: string };
    limit?: number;
    resource: R;
  },
): Promise<readonly CrmCoreEntityByResource[R][]> {
  const limit = input.limit ?? 1_000;
  const pagedWhere = (table: {
    createdAt: unknown;
    id: unknown;
    storeId: unknown;
    tenantId: unknown;
  }) =>
    and(
      eq(table.tenantId as never, input.tenantId),
      eq(table.storeId as never, input.storeId),
      input.cursor
        ? or(
            gt(table.createdAt as never, input.cursor.createdAt),
            and(
              eq(table.createdAt as never, input.cursor.createdAt),
              gt(table.id as never, input.cursor.id),
            ),
          )
        : undefined,
    );
  let values: readonly unknown[];
  switch (input.resource) {
    case "contacts":
      values = (
        await db
          .select()
          .from(contacts)
          .where(pagedWhere(contacts))
          .orderBy(asc(contacts.createdAt), asc(contacts.id))
          .limit(limit)
      ).map(mapContact);
      break;
    case "contact-identities": {
      const rows = await db
        .select()
        .from(contactIdentities)
        .where(pagedWhere(contactIdentities))
        .orderBy(asc(contactIdentities.createdAt), asc(contactIdentities.id))
        .limit(limit);
      values = await hydrateIdentityRows(db, input, rows);
      break;
    }
    case "opportunities":
      values = (
        await db
          .select()
          .from(opportunities)
          .where(pagedWhere(opportunities))
          .orderBy(asc(opportunities.createdAt), asc(opportunities.id))
          .limit(limit)
      ).map(mapOpportunity);
      break;
    case "connections":
      values = (
        await db
          .select()
          .from(providerConnections)
          .where(pagedWhere(providerConnections))
          .orderBy(
            asc(providerConnections.createdAt),
            asc(providerConnections.id),
          )
          .limit(limit)
      ).map(mapConnection);
      break;
    case "consents":
      values = (
        await db
          .select()
          .from(consentReceipts)
          .where(pagedWhere(consentReceipts))
          .orderBy(asc(consentReceipts.createdAt), asc(consentReceipts.id))
          .limit(limit)
      ).map(mapConsent);
      break;
    case "fact-proposals":
      values = (
        await db
          .select()
          .from(factProposals)
          .where(pagedWhere(factProposals))
          .orderBy(asc(factProposals.createdAt), asc(factProposals.id))
          .limit(limit)
      ).map(mapFactProposal);
      break;
    case "conversations": {
      const rows = await db
        .select({
          attendance: conversationAttendances,
          connection: providerConnections,
          thread: conversationThreads,
        })
        .from(conversationThreads)
        .innerJoin(
          providerConnections,
          and(
            eq(
              providerConnections.id,
              conversationThreads.providerConnectionId,
            ),
            eq(providerConnections.tenantId, conversationThreads.tenantId),
            eq(providerConnections.storeId, conversationThreads.storeId),
          ),
        )
        .leftJoin(
          conversationAttendances,
          and(
            eq(conversationAttendances.threadId, conversationThreads.id),
            eq(conversationAttendances.tenantId, conversationThreads.tenantId),
            eq(conversationAttendances.storeId, conversationThreads.storeId),
          ),
        )
        .where(pagedWhere(conversationThreads))
        .orderBy(
          asc(conversationThreads.createdAt),
          asc(conversationThreads.id),
        )
        .limit(limit);
      values = rows.map((row) =>
        mapConversation(row.thread, row.connection, row.attendance),
      );
      break;
    }
  }
  return values as readonly CrmCoreEntityByResource[R][];
}

export async function getDrizzleCrmCore<R extends CrmCoreResource>(
  db: DrizzleCrmCoreClient,
  input: CrmCoreScope & { id: string; resource: R },
): Promise<CrmCoreEntityByResource[R] | null> {
  const values = await listDrizzleCrmCore(db, input);
  return values.find((value) => value.id === input.id) ?? null;
}
