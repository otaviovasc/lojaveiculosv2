import {
  contactIdentities,
  contactIdentityCandidates,
  contacts,
  consentReceipts,
  conversationAttendances,
  conversationCycles,
  conversationThreads,
  factProposals,
  observedFacts,
  opportunities,
  providerConnections,
} from "@lojaveiculosv2/db";
import { and, eq } from "drizzle-orm";
import type {
  CrmCoreEntityByResource,
  CrmCoreResource,
  CrmCoreScope,
  CreateCrmCoreEntity,
} from "../../../domains/crm/core/models.js";
import type { DrizzleCrmCoreClient } from "./drizzleCrmCoreRepository.js";
import {
  mapConnection,
  mapConsent,
  mapContact,
  mapConversation,
  mapFactProposal,
  mapIdentity,
  mapOpportunity,
} from "./drizzleCrmCoreMappers.js";

export async function createDrizzleCrmCore<R extends CrmCoreResource>(
  db: DrizzleCrmCoreClient,
  input: { data: CreateCrmCoreEntity<R>; resource: R; scope: CrmCoreScope },
): Promise<CrmCoreEntityByResource[R]> {
  const { resource, scope } = input;
  let value: unknown;
  switch (resource) {
    case "contacts": {
      const data = input.data as CreateCrmCoreEntity<"contacts">;
      value = mapContact(
        required(
          await db
            .insert(contacts)
            .values({ displayName: data.displayName, ...scope })
            .returning(),
        ),
      );
      break;
    }
    case "contact-identities": {
      const data = input.data as CreateCrmCoreEntity<"contact-identities">;
      value = await db.transaction(async (tx) => {
        const identity = required(
          await tx
            .insert(contactIdentities)
            .values({
              contactId: data.contactId,
              identityKind: data.kind,
              normalizedValue: data.normalizedValue,
              state: data.verification,
              ...(data.verification === "verified"
                ? { verifiedAt: new Date() }
                : {}),
              ...scope,
            })
            .returning(),
        );
        const candidateContactIds = [...new Set(data.candidateContactIds)];
        if (candidateContactIds.length > 0) {
          await tx.insert(contactIdentityCandidates).values(
            candidateContactIds.map((contactId) => ({
              contactId,
              identityId: identity.id,
              ...scope,
            })),
          );
        }
        return mapIdentity(identity, candidateContactIds);
      });
      break;
    }
    case "opportunities": {
      const data = input.data as CreateCrmCoreEntity<"opportunities">;
      value = mapOpportunity(
        required(
          await db
            .insert(opportunities)
            .values({
              contactId: data.contactId,
              metadata: {
                interests: data.interests,
                pipelineId: data.pipelineId,
                pipelineStageId: data.pipelineStageId,
              },
              source: "manual",
              state: data.status,
              ...scope,
            })
            .returning(),
        ),
      );
      break;
    }
    case "connections": {
      const data = input.data as CreateCrmCoreEntity<"connections">;
      value = mapConnection(
        required(
          await db
            .insert(providerConnections)
            .values({
              broker: data.credentialBroker,
              channel: data.channel,
              displayName: `${data.channel}:${data.transportProvider}`,
              metadata: {
                capabilities: data.capabilities,
                degraded: data.degraded,
                errorCode: data.errorCode,
              },
              provider: data.transportProvider,
              state: data.operational ? "active" : "sandbox",
              ...scope,
            })
            .returning(),
        ),
      );
      break;
    }
    case "consents": {
      const data = input.data as CreateCrmCoreEntity<"consents">;
      value = mapConsent(
        required(
          await db
            .insert(consentReceipts)
            .values({
              channel: data.channel,
              contactId: data.contactId,
              evidenceReference: data.evidence,
              identityId: data.identityId,
              legalBasis: "consent",
              occurredAt: data.occurredAt,
              policyVersion: data.policyVersion,
              purpose: data.purpose,
              source: data.source,
              state: data.status === "opt_in" ? "granted" : "withdrawn",
              ...scope,
            })
            .returning(),
        ),
      );
      break;
    }
    case "fact-proposals": {
      const data = input.data as CreateCrmCoreEntity<"fact-proposals">;
      value = await db.transaction(async (tx) => {
        const observed = required(
          await tx
            .insert(observedFacts)
            .values({
              confidence: 0,
              contactId: data.contactId,
              factKey: "proposal",
              factValue: data.facts,
              ...scope,
            })
            .returning(),
        );
        return mapFactProposal(
          required(
            await tx
              .insert(factProposals)
              .values({
                contactId: data.contactId,
                factKey: "proposal",
                observedFactId: observed.id,
                proposedValue: data.facts,
                state: "pending",
                ...scope,
              })
              .returning(),
          ),
        );
      });
      break;
    }
    case "conversations": {
      const data = input.data as CreateCrmCoreEntity<"conversations">;
      value = await db.transaction(async (tx) => {
        const thread = required(
          await tx
            .insert(conversationThreads)
            .values({
              channel: data.channel,
              contactId: data.contactId,
              metadata: {
                pipelineId: data.pipelineId,
                pipelineStageId: data.pipelineStageId,
                unreadCount: data.unreadCount,
              },
              providerConnectionId: data.connectionId,
              state: data.threadState,
              ...scope,
            })
            .returning(),
        );
        const cycle = required(
          await tx
            .insert(conversationCycles)
            .values({ threadId: thread.id, ...scope })
            .returning(),
        );
        const attendance = required(
          await tx
            .insert(conversationAttendances)
            .values({
              cycleId: cycle.id,
              state: data.attendanceState,
              threadId: thread.id,
              ...scope,
            })
            .returning(),
        );
        const [connection] = await tx
          .select()
          .from(providerConnections)
          .where(
            and(
              eq(providerConnections.id, data.connectionId),
              eq(providerConnections.storeId, scope.storeId),
              eq(providerConnections.tenantId, scope.tenantId),
            ),
          )
          .limit(1);
        if (!connection)
          throw new Error(
            "CRM core connection disappeared during conversation creation.",
          );
        return mapConversation(thread, connection, attendance);
      });
      break;
    }
  }
  return value as CrmCoreEntityByResource[R];
}
function required<T>(rows: readonly T[]): T {
  const row = rows[0];
  if (!row) throw new Error("Drizzle CRM core mutation returned no row.");
  return row;
}
