import { and, eq, inArray, sql } from "drizzle-orm";
import {
  crmMessages,
  conversationAttendances,
  conversationCycles,
  conversationThreads,
  integrationEvents,
  crmChannelConnections,
  providerEvents,
} from "@lojaveiculosv2/db";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  retentionCandidateIds,
  type DrizzleCrmRetentionMutationInput,
  withoutActiveRetentionHold,
} from "./drizzleCrmRetentionMutationSupport.js";

export async function applyCrmContentRetention(
  db: DrizzleCrmClient,
  input: DrizzleCrmRetentionMutationInput,
): Promise<number> {
  let affected = 0;
  const canonicalIds = retentionCandidateIds(input, "canonical_message");
  const eventIds = retentionCandidateIds(input, "integration_event");
  const olxLeadReceiptIds = retentionCandidateIds(input, "olx_lead_receipt");

  if (canonicalIds.length > 0) {
    const rows = await db
      .update(crmMessages)
      .set({
        content: "",
        mediaType: null,
        mediaUrl: null,
        metadata: sql`jsonb_build_object(
          'retention', jsonb_build_object(
            'anonymizedAt', ${input.now.toISOString()},
            'policy', 'closed_cycle_18_months'
          )
        )`,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(crmMessages.tenantId, input.tenantId),
          eq(crmMessages.storeId, input.storeId),
          inArray(crmMessages.id, canonicalIds),
          sql`exists (
            select 1
            from ${conversationCycles} cycle
            inner join ${conversationThreads} thread
              on thread.id = ${crmMessages.threadId}
              and thread.tenant_id = ${crmMessages.tenantId}
              and thread.store_id = ${crmMessages.storeId}
              and thread.provider_connection_id = ${crmMessages.providerConnectionId}
            inner join ${conversationAttendances} attendance
              on attendance.cycle_id = cycle.id
              and attendance.thread_id = thread.id
              and attendance.tenant_id = ${crmMessages.tenantId}
              and attendance.store_id = ${crmMessages.storeId}
            inner join ${crmChannelConnections} connection
              on connection.id = ${crmMessages.providerConnectionId}
              and connection.tenant_id = ${crmMessages.tenantId}
              and connection.store_id = ${crmMessages.storeId}
              and connection.provider = ${crmMessages.provider}
              and connection.channel = thread.channel
            where cycle.id = ${crmMessages.cycleId}
              and cycle.tenant_id = ${crmMessages.tenantId}
              and cycle.store_id = ${crmMessages.storeId}
              and cycle.thread_id = ${crmMessages.threadId}
              and cycle.closed_at is not null
              and cycle.state in ('completed', 'expired')
              and greatest(
                cycle.closed_at,
                attendance.changed_at,
                coalesce(thread.last_message_at, cycle.closed_at),
                (select max(cycle_message.occurred_at)
                 from ${crmMessages} cycle_message
                 where cycle_message.tenant_id = ${crmMessages.tenantId}
                   and cycle_message.store_id = ${crmMessages.storeId}
                   and cycle_message.cycle_id = ${crmMessages.cycleId})
              ) <= ${input.cutoffs.canonicalMessageBefore}
          )`,
          withoutActiveRetentionHold(
            "canonical_message",
            "canonical_message",
            crmMessages.id,
            input,
          ),
        ),
      )
      .returning({ id: crmMessages.id });
    affected += rows.length;
  }

  if (eventIds.length > 0) {
    const rows = await db
      .update(integrationEvents)
      .set({ payload: {}, updatedAt: input.now })
      .where(
        and(
          eq(integrationEvents.tenantId, input.tenantId),
          eq(integrationEvents.storeId, input.storeId),
          inArray(integrationEvents.id, eventIds),
          sql`${integrationEvents.occurredAt} <= ${input.cutoffs.providerRawPayloadBefore}`,
          withoutActiveRetentionHold(
            "provider_raw_payload",
            "integration_event",
            integrationEvents.id,
            input,
          ),
        ),
      )
      .returning({ id: integrationEvents.id });
    affected += rows.length;
  }
  if (olxLeadReceiptIds.length > 0) {
    const rows = await db
      .update(providerEvents)
      .set({
        errorMessage: "OlxLeadReceiptExpired",
        payload: sql`jsonb_build_object(
          'schemaVersion', 3,
          'identityKey', coalesce(${providerEvents.payload} ->> 'identityKey', 'unknown'),
          'receiptClearedAt', ${input.now.toISOString()}
        )`,
        processedAt: input.now,
        processingStartedAt: null,
        processingToken: null,
        status: "ignored",
        updatedAt: input.now,
      })
      .where(
        and(
          eq(providerEvents.tenantId, input.tenantId),
          eq(providerEvents.storeId, input.storeId),
          inArray(providerEvents.id, olxLeadReceiptIds),
          eq(providerEvents.provider, "olx_chat"),
          eq(providerEvents.eventType, "crm.lead.olx.received"),
          inArray(providerEvents.status, ["received", "processing", "failed"]),
          sql`${providerEvents.createdAt} <= (${input.now}::timestamptz - interval '7 days')`,
          sql`${providerEvents.payload} ? 'sealedReceipt'`,
          withoutActiveRetentionHold(
            "provider_raw_payload",
            "olx_lead_receipt",
            providerEvents.id,
            input,
          ),
        ),
      )
      .returning({ id: providerEvents.id });
    affected += rows.length;
  }
  return affected;
}
