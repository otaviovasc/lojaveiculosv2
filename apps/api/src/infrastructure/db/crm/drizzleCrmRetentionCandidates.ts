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
    | "olx_lead_receipt"
    | "provider_effect";
}>;

export async function listDrizzleCrmRetentionCandidates(
  db: DrizzleCrmClient,
  input: {
    botCutoff: Date;
    canonicalCutoff: Date;
    cursor: CrmRetentionCursor | null;
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
        greatest(
          cycle.closed_at,
          attendance.changed_at,
          coalesce(thread.last_message_at, cycle.closed_at),
          activity.last_activity_at
        ) as eligible_at
      from crm_messages message
      inner join crm_conversation_cycles cycle
        on cycle.id = message.cycle_id
        and cycle.tenant_id = message.tenant_id
        and cycle.store_id = message.store_id
        and cycle.thread_id = message.thread_id
      inner join crm_conversation_threads thread
        on thread.id = message.thread_id
        and thread.tenant_id = message.tenant_id
        and thread.store_id = message.store_id
        and thread.provider_connection_id = message.provider_connection_id
      inner join crm_conversation_attendances attendance
        on attendance.cycle_id = message.cycle_id
        and attendance.thread_id = message.thread_id
        and attendance.tenant_id = message.tenant_id
        and attendance.store_id = message.store_id
      inner join crm_channel_connections connection
        on connection.id = message.provider_connection_id
        and connection.tenant_id = message.tenant_id
        and connection.store_id = message.store_id
        and connection.provider = message.provider
        and connection.channel = thread.channel
      inner join lateral (
        select max(cycle_message.occurred_at) as last_activity_at
        from crm_messages cycle_message
        where cycle_message.tenant_id = message.tenant_id
          and cycle_message.store_id = message.store_id
          and cycle_message.cycle_id = message.cycle_id
      ) activity on true
      where message.tenant_id = ${input.tenantId}::uuid
        and message.store_id = ${input.storeId}::uuid
        and cycle.closed_at is not null
        and cycle.state in ('completed', 'expired')
        and greatest(
          cycle.closed_at,
          attendance.changed_at,
          coalesce(thread.last_message_at, cycle.closed_at),
          activity.last_activity_at
        ) <= ${input.canonicalCutoff}
        and coalesce(message.metadata -> 'retention' ->> 'anonymizedAt', '') = ''

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
      from crm_external_bot_action_commands command
      where command.tenant_id = ${input.tenantId}::uuid
        and command.store_id = ${input.storeId}::uuid
        and command.created_at <= ${input.botCutoff}
        and command.input <> '{}'::jsonb

      union all

      select 'bot_interaction', 'provider_effect', effect.id::text, effect.created_at
      from crm_external_bot_provider_effects effect
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
              or hold.resource_type = raw_candidates.resource_type)
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
