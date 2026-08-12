import { and, eq, inArray, sql } from "drizzle-orm";
import { crmWhatsappMessages, crmWhatsappSessions } from "@lojaveiculosv2/db";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  retentionCandidateIds,
  type DrizzleCrmRetentionMutationInput,
  withoutActiveRetentionHold,
} from "./drizzleCrmRetentionMutationSupport.js";

export async function applyCrmLegacyWindowRetention(
  db: DrizzleCrmClient,
  input: DrizzleCrmRetentionMutationInput,
): Promise<number> {
  const messageIds = retentionCandidateIds(input, "legacy_message");
  const sessionIds = retentionCandidateIds(input, "legacy_session");
  let affected = 0;

  if (messageIds.length > 0) {
    const rows = await db
      .update(crmWhatsappMessages)
      .set({
        content: "",
        mediaType: null,
        mediaUrl: null,
        metadata: retentionMarker(input),
        updatedAt: input.now,
      })
      .where(
        and(
          eq(crmWhatsappMessages.tenantId, input.tenantId),
          eq(crmWhatsappMessages.storeId, input.storeId),
          inArray(crmWhatsappMessages.id, messageIds),
          withoutScopedLegacyCoverageGap(input),
          eligibleLegacySession(crmWhatsappMessages.sessionId, input),
          withoutActiveRetentionHold(
            "canonical_message",
            "legacy_message",
            crmWhatsappMessages.id,
            input,
            "canonical_message",
          ),
        ),
      )
      .returning({ id: crmWhatsappMessages.id });
    affected += rows.length;
  }

  if (sessionIds.length > 0) {
    const rows = await db
      .update(crmWhatsappSessions)
      .set({
        buyerChatLid: null,
        buyerName: null,
        buyerPhone: "",
        channelExternalId: null,
        channelMetadata: {},
        externalSessionId: null,
        lastMessageContent: null,
        metadata: retentionMarker(input),
        profilePhotoUrl: null,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(crmWhatsappSessions.tenantId, input.tenantId),
          eq(crmWhatsappSessions.storeId, input.storeId),
          inArray(crmWhatsappSessions.id, sessionIds),
          withoutScopedLegacyCoverageGap(input),
          eligibleLegacySession(crmWhatsappSessions.id, input),
          withoutActiveRetentionHold(
            "canonical_message",
            "legacy_session",
            crmWhatsappSessions.id,
            input,
          ),
        ),
      )
      .returning({ id: crmWhatsappSessions.id });
    affected += rows.length;
  }
  return affected;
}

function withoutScopedLegacyCoverageGap(
  input: Pick<DrizzleCrmRetentionMutationInput, "storeId" | "tenantId">,
) {
  return sql`not exists (
    select 1 from crm_retention_legacy_coverage coverage
    where coverage.tenant_id = ${input.tenantId}::uuid
      and coverage.store_id = ${input.storeId}::uuid
      and coverage.unreconciled_rows > 0
  )`;
}

function eligibleLegacySession(
  sessionId:
    typeof crmWhatsappSessions.id | typeof crmWhatsappMessages.sessionId,
  input: DrizzleCrmRetentionMutationInput,
) {
  return sql`exists (
    select 1
    from crm_whatsapp_sessions session
    inner join crm_connections connection
      on connection.id = session.connection_id
      and connection.tenant_id = session.tenant_id
      and connection.store_id = session.store_id
    where session.id = ${sessionId}
      and session.tenant_id = ${input.tenantId}::uuid
      and session.store_id = ${input.storeId}::uuid
      and ((connection.provider = 'zapi' and session.channel = 'WHATSAPP')
        or (connection.provider = 'olx_chat' and session.channel = 'OLX_CHAT'))
      and session.status in ('COMPLETED', 'EXPIRED')
      and greatest(
        session.updated_at,
        coalesce((select max(coalesce(message.provider_timestamp, message.created_at))
          from crm_whatsapp_messages message
          where message.tenant_id = session.tenant_id
            and message.store_id = session.store_id
            and message.session_id = session.id), session.updated_at)
      ) <= ${input.cutoffs.canonicalMessageBefore}
  )`;
}

function retentionMarker(input: DrizzleCrmRetentionMutationInput) {
  return {
    retention: {
      anonymizedAt: input.now.toISOString(),
      policy: "legacy_provider_window_18_months",
    },
  };
}
