import { sql } from "drizzle-orm";
import type { CrmRetentionCategory } from "../../../domains/crm/ports/crmRetentionRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import type { CrmRetentionCursor } from "./drizzleCrmRetentionCursor.js";

export type DrizzleCrmRetentionCandidate = Readonly<{
  category: CrmRetentionCategory;
  eligibleAt: Date;
  held: boolean;
  resourceId: string;
  resourceType:
    | "bot_action_command"
    | "canonical_message"
    | "external_bot_event"
    | "external_bot_grant"
    | "external_bot_proposal"
    | "integration_event"
    | "legacy_message"
    | "legacy_session"
    | "olx_lead_receipt"
    | "provider_effect";
}>;

export async function listDrizzleCrmRetentionCandidates(
  db: DrizzleCrmClient,
  input: {
    botCutoff: Date;
    canonicalCutoff: Date;
    cursor: CrmRetentionCursor | null;
    includeLegacyWindow: boolean;
    limit: number;
    now: Date;
    providerCutoff: Date;
    storeId: string;
    tenantId: string;
  },
): Promise<DrizzleCrmRetentionCandidate[]> {
  const cursorFilter = input.cursor
    ? sql`where (eligible_at, category, resource_type, resource_id) >
        (${input.cursor.eligibleAt}, ${input.cursor.category}, ${input.cursor.resourceType}, ${input.cursor.resourceId})`
    : sql``;
  const rows = await db.execute(sql`
    with raw_candidates as (
      select
        'canonical_message'::text as category,
        'canonical_message'::text as resource_type,
        message.id::text as resource_id,
        greatest(cycle.closed_at, activity.last_activity_at) as eligible_at
      from canonical_messages message
      inner join conversation_cycles cycle
        on cycle.id = message.cycle_id
        and cycle.tenant_id = message.tenant_id
        and cycle.store_id = message.store_id
      inner join lateral (
        select max(cycle_message.occurred_at) as last_activity_at
        from canonical_messages cycle_message
        where cycle_message.tenant_id = message.tenant_id
          and cycle_message.store_id = message.store_id
          and cycle_message.cycle_id = message.cycle_id
      ) activity on true
      where message.tenant_id = ${input.tenantId}::uuid
        and message.store_id = ${input.storeId}::uuid
        and cycle.closed_at is not null
        and cycle.state in ('completed', 'expired')
        and greatest(cycle.closed_at, activity.last_activity_at) <= ${input.canonicalCutoff}
        and coalesce(message.metadata -> 'retention' ->> 'anonymizedAt', '') = ''

      union all

      select
        'canonical_message'::text,
        'legacy_message'::text,
        message.id::text,
        greatest(session.updated_at, activity.last_activity_at)
      from crm_whatsapp_messages message
      inner join crm_whatsapp_sessions session
        on session.id = message.session_id
        and session.tenant_id = message.tenant_id
        and session.store_id = message.store_id
        and session.connection_id = message.connection_id
      inner join crm_connections connection
        on connection.id = session.connection_id
        and connection.tenant_id = session.tenant_id
        and connection.store_id = session.store_id
      inner join lateral (
        select coalesce(max(coalesce(cycle_message.provider_timestamp, cycle_message.created_at)), session.updated_at) as last_activity_at
        from crm_whatsapp_messages cycle_message
        where cycle_message.tenant_id = message.tenant_id
          and cycle_message.store_id = message.store_id
          and cycle_message.session_id = message.session_id
      ) activity on true
      where message.tenant_id = ${input.tenantId}::uuid
        and message.store_id = ${input.storeId}::uuid
        and ${input.includeLegacyWindow}
        and ((connection.provider = 'zapi' and session.channel = 'WHATSAPP')
          or (connection.provider = 'olx_chat' and session.channel = 'OLX_CHAT'))
        and session.status in ('COMPLETED', 'EXPIRED')
        and greatest(session.updated_at, activity.last_activity_at) <= ${input.canonicalCutoff}
        and (message.content <> '' or message.media_type is not null or message.media_url is not null
          or coalesce(message.metadata -> 'retention' ->> 'anonymizedAt', '') = '')

      union all

      select
        'canonical_message'::text,
        'legacy_session'::text,
        session.id::text,
        greatest(session.updated_at, activity.last_activity_at)
      from crm_whatsapp_sessions session
      inner join crm_connections connection
        on connection.id = session.connection_id
        and connection.tenant_id = session.tenant_id
        and connection.store_id = session.store_id
      inner join lateral (
        select coalesce(max(coalesce(message.provider_timestamp, message.created_at)), session.updated_at) as last_activity_at
        from crm_whatsapp_messages message
        where message.tenant_id = session.tenant_id
          and message.store_id = session.store_id
          and message.session_id = session.id
      ) activity on true
      where session.tenant_id = ${input.tenantId}::uuid
        and session.store_id = ${input.storeId}::uuid
        and ${input.includeLegacyWindow}
        and ((connection.provider = 'zapi' and session.channel = 'WHATSAPP')
          or (connection.provider = 'olx_chat' and session.channel = 'OLX_CHAT'))
        and session.status in ('COMPLETED', 'EXPIRED')
        and greatest(session.updated_at, activity.last_activity_at) <= ${input.canonicalCutoff}
        and (session.buyer_phone <> '' or session.buyer_name is not null
          or session.buyer_chat_lid is not null or session.channel_external_id is not null
          or session.external_session_id is not null or session.last_message_content is not null
          or session.profile_photo_url is not null
          or session.channel_metadata <> '{}'::jsonb
          or coalesce(session.metadata -> 'retention' ->> 'anonymizedAt', '') = '')

      union all

      select 'provider_raw_payload', 'integration_event', event.id::text, event.occurred_at
      from integration_events event
      where event.tenant_id = ${input.tenantId}::uuid
        and event.store_id = ${input.storeId}::uuid
        and event.occurred_at <= ${input.providerCutoff}
        and event.payload <> '{}'::jsonb

      union all

      select 'provider_raw_payload', 'olx_lead_receipt', event.id::text, event.created_at
      from provider_events event
      where event.tenant_id = ${input.tenantId}::uuid
        and event.store_id = ${input.storeId}::uuid
        and event.provider = 'olx_chat'
        and event.event_type = 'crm.lead.olx.received'
        and event.status in ('received', 'processing', 'failed')
        and event.created_at <= (${input.now}::timestamptz - interval '7 days')
        and event.payload ? 'sealedReceipt'

      union all

      select 'bot_interaction', 'bot_action_command', command.id::text, command.created_at
      from bot_action_commands command
      where command.tenant_id = ${input.tenantId}::uuid
        and command.store_id = ${input.storeId}::uuid
        and command.created_at <= ${input.botCutoff}
        and command.input <> '{}'::jsonb

      union all

      select 'bot_interaction', 'provider_effect', effect.id::text, effect.created_at
      from provider_effects effect
      where effect.tenant_id = ${input.tenantId}::uuid
        and effect.store_id = ${input.storeId}::uuid
        and effect.created_at <= ${input.botCutoff}
        and effect.result <> '{}'::jsonb

      union all

      select 'bot_interaction', 'external_bot_grant', event.id::text, event.created_at
      from crm_external_bot_event_outbox event
      where event.tenant_id = ${input.tenantId}::uuid
        and event.store_id = ${input.storeId}::uuid
        and event.grant_token is not null
        and (event.state = 'delivered' or event.grant_expires_at <= ${input.now})

      union all

      select 'bot_interaction', 'external_bot_event', event.id::text, event.created_at
      from crm_external_bot_event_outbox event
      where event.tenant_id = ${input.tenantId}::uuid
        and event.store_id = ${input.storeId}::uuid
        and event.created_at <= ${input.botCutoff}
        and event.state in ('delivered', 'dead_letter')
        and event.payload <> '{}'::jsonb

      union all

      select 'bot_interaction', 'external_bot_proposal', proposal.id::text, proposal.created_at
      from crm_external_bot_proposals proposal
      where proposal.tenant_id = ${input.tenantId}::uuid
        and proposal.store_id = ${input.storeId}::uuid
        and proposal.created_at <= ${input.botCutoff}
        and proposal.payload <> '{}'::jsonb
    ), candidates as (
      select raw_candidates.*,
        case when raw_candidates.resource_type = 'external_bot_grant' then false else exists (
          select 1
          from crm_retention_legal_holds hold
          where hold.tenant_id = ${input.tenantId}::uuid
            and hold.store_id = ${input.storeId}::uuid
            and hold.released_at is null
            and hold.starts_at <= ${input.now}
            and (hold.expires_at is null or hold.expires_at > ${input.now})
            and (hold.category is null or hold.category = raw_candidates.category)
            and (hold.resource_type is null
              or hold.resource_type = raw_candidates.resource_type
              or (raw_candidates.resource_type = 'legacy_message'
                and hold.resource_type = 'canonical_message'))
            and (hold.resource_id is null or hold.resource_id::text = raw_candidates.resource_id)
        ) end as held
      from raw_candidates
    )
    select category, resource_type, resource_id, eligible_at, held
    from candidates
    ${cursorFilter}
    order by eligible_at, category, resource_type, resource_id
    limit ${input.limit}
  `);
  return (rows as unknown as Array<Record<string, unknown>>).map((row) => ({
    category: String(row.category) as CrmRetentionCategory,
    eligibleAt: new Date(String(row.eligible_at)),
    held: row.held === true,
    resourceId: String(row.resource_id),
    resourceType: String(
      row.resource_type,
    ) as DrizzleCrmRetentionCandidate["resourceType"],
  }));
}
