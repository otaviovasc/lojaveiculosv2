import { sql } from "drizzle-orm";
import type { ExternalBotManagerPorts } from "../../../domains/crm/bot/ports/externalBotPorts.js";
import {
  type ExternalBotDb,
  type ExternalBotRow,
  mapExternalBotCommand,
  mapExternalBotEvent,
} from "./drizzleExternalBotShared.js";

export function createExternalBotActionRepository(
  db: ExternalBotDb,
  digest: (value: string) => string,
): ExternalBotManagerPorts["actionRepository"] {
  return {
    accept: async (command) => {
      const existing = await findCommandByIdempotency(db, command);
      if (existing) {
        return existing.requestDigest === command.requestDigest
          ? { kind: "existing", record: existing }
          : { kind: "conflict" };
      }
      const rows = await db.execute(sql`
        insert into bot_action_commands
          (action_type, expected_revision, grant_id, idempotency_key, input, provider,
           provider_connection_id, request_digest, authorization_class, state, thread_id, store_id, tenant_id)
        select ${command.command.action}, ${command.expectedRevision}, grant.id, ${command.idempotencyKey},
          ${JSON.stringify({ channel: command.channel, command: command.command, integrationId: command.integrationId, modelVersion: command.modelVersion })}::jsonb, connection.provider,
          ${command.connectionId}::uuid, ${command.requestDigest},
          ${command.actionClass === "proposal" ? "proposal_only" : "automatic"}, 'accepted',
          ${command.threadId}::uuid, ${command.storeId}::uuid, ${command.tenantId}::uuid
        from bot_integration_grants grant
        inner join provider_connections connection on connection.id = grant.provider_connection_id
          and connection.tenant_id=grant.tenant_id and connection.store_id=grant.store_id
          and connection.provider=grant.provider
          and connection.channel=${command.channel}
        where grant.token_digest = ${digest(command.capabilityGrant)}
          and grant.authorized_request_digest=${command.requestDigest}
          and grant.tenant_id = ${command.tenantId}::uuid and grant.store_id = ${command.storeId}::uuid
          and grant.integration_id=${command.integrationId}::uuid
          and grant.provider_connection_id=${command.connectionId}::uuid
          and grant.thread_id=${command.threadId}::uuid and grant.provider=${command.provider}
          and grant.model_version=${command.modelVersion} and grant.action_type=${command.command.action}
          and grant.action_class=${command.actionClass === "proposal" ? "proposal_only" : "automatic"}
          and grant.state='consumed' and grant.expires_at>now()
        returning *`);
      const row = (rows as unknown as ExternalBotRow[])[0];
      if (!row) return { kind: "conflict" };
      return { kind: "accepted", record: mapExternalBotCommand(row) };
    },
    transition: async (id, expected, state, failureCode) => {
      const rows = await db.execute(sql`
        update bot_action_commands set state = ${state}, revision = revision + 1, updated_at = now(),
          input = case when ${failureCode ?? null}::text is null then input else jsonb_set(input, '{failureCode}', to_jsonb(${failureCode ?? null}::text), true) end
        where id = ${id}::uuid and state = any(${expected}::bot_action_command_state[])
        returning *`);
      const row = (rows as unknown as ExternalBotRow[])[0];
      return row ? mapExternalBotCommand(row) : null;
    },
  };
}

export function createExternalBotEventOutbox(
  db: ExternalBotDb,
): ExternalBotManagerPorts["eventOutbox"] {
  return {
    enqueue: async (event) => {
      await db.execute(sql`insert into crm_external_bot_event_outbox
      (id, tenant_id, store_id, integration_id, provider_connection_id, thread_id, provider, action_class, model_version, event_type, payload, grant_token, authorized_request_digest, grant_expires_at, occurred_at)
      values (${event.id}::uuid, ${event.tenantId}::uuid, ${event.storeId}::uuid, ${event.integrationId}::uuid,
        ${event.connectionId}::uuid, ${event.threadId}::uuid, ${event.provider}, ${event.actionClass}, ${event.modelVersion}, ${event.type}, ${JSON.stringify(event.payload)}::jsonb,
        ${event.grant}, ${event.authorizedRequestDigest}, ${event.grantExpiresAt}, ${event.occurredAt})`);
    },
    claim: async (now) => {
      await db.execute(sql`update crm_external_bot_event_outbox
        set grant_token = null, payload = '{}'::jsonb, state = 'dead_letter',
            last_error_code = coalesce(last_error_code, 'grant_expired'), updated_at = now()
        where state in ('pending', 'processing') and grant_expires_at <= ${now}
          and (grant_token is not null or payload <> '{}'::jsonb)`);
      const rows =
        await db.execute(sql`update crm_external_bot_event_outbox set state = 'processing', attempt_count = attempt_count + 1, updated_at = now()
        where id = (select id from crm_external_bot_event_outbox where state = 'pending' and next_attempt_at <= ${now}
          and grant_expires_at > ${now} and grant_token is not null
          order by next_attempt_at, created_at for update skip locked limit 1) returning *`);
      const row = (rows as unknown as ExternalBotRow[])[0];
      return row ? mapExternalBotEvent(row) : null;
    },
    markDeadLetter: async (id, code) =>
      void (await db.execute(
        sql`update crm_external_bot_event_outbox set state='dead_letter', grant_token=null, last_error_code=${code}, updated_at=now() where id=${id}::uuid`,
      )),
    markDelivered: async (id) =>
      void (await db.execute(
        sql`update crm_external_bot_event_outbox set state='delivered', grant_token=null, updated_at=now() where id=${id}::uuid`,
      )),
    release: async (id, retryAt, code) =>
      void (await db.execute(
        sql`update crm_external_bot_event_outbox set state='pending', next_attempt_at=${retryAt}, last_error_code=${code}, updated_at=now() where id=${id}::uuid`,
      )),
  };
}

async function findCommandByIdempotency(
  db: ExternalBotDb,
  input: { tenantId: string; storeId: string; idempotencyKey: string },
) {
  const rows = await db.execute(
    sql`select * from bot_action_commands where tenant_id=${input.tenantId}::uuid and store_id=${input.storeId}::uuid and idempotency_key=${input.idempotencyKey} limit 1`,
  );
  const row = (rows as unknown as ExternalBotRow[])[0];
  return row ? mapExternalBotCommand(row) : null;
}
