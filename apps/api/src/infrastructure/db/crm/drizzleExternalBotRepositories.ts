import { sql } from "drizzle-orm";
import type { ExternalBotManagerPorts } from "../../../domains/crm/bot/ports/externalBotPorts.js";
import { evaluateExternalBotPolicy } from "../../../domains/crm/bot/policies/externalBotPolicy.js";
import {
  type ExternalBotDb,
  type ExternalBotRow,
  mapExternalBotCommand,
  mapExternalBotEvent,
} from "./drizzleExternalBotShared.js";

type ReservationRow = ExternalBotRow & {
  actions_today: number | string;
  attendance_state: string;
  channel: "instagram" | "olx_chat" | "whatsapp";
  connection_actions_last_minute: number | string;
  connection_rate_per_minute: number;
  connection_ready: boolean;
  cooldown_seconds: number;
  daily_limit: number;
  evaluated_at: Date | string;
  grant_state: "consumed" | "expired" | "issued" | "revoked";
  last_conversation_action_at: Date | string | null;
  mode: "auto" | "disabled" | "proposal";
};
export function createExternalBotActionRepository(
  db: ExternalBotDb,
  digest: (value: string) => string,
): ExternalBotManagerPorts["actionRepository"] {
  return {
    accept: (command) =>
      db.transaction(async (transaction) => {
        const replay = await findCommandByIdempotency(transaction, command);
        if (replay) return replayResult(replay, command.requestDigest);

        await transaction.execute(sql`select pg_advisory_xact_lock(hashtextextended(lock_key, 0))
          from unnest(array[
            ${`bot:conversation:${command.tenantId}:${command.storeId}:${command.threadId}`},
            ${`bot:connection:${command.tenantId}:${command.storeId}:${command.connectionId}`},
            ${`bot:daily:${command.tenantId}:${command.storeId}`}
          ]::text[]) lock_key order by lock_key`);

        const lockedReplay = await findCommandByIdempotency(
          transaction,
          command,
        );
        if (lockedReplay) {
          return replayResult(lockedReplay, command.requestDigest);
        }

        const reservation = await loadReservation(
          transaction,
          command,
          digest(command.capabilityGrant),
        );
        if (
          !reservation ||
          reservation.grant_state === "expired" ||
          reservation.grant_state === "revoked"
        ) {
          return { kind: "grant_invalid" } as const;
        }
        if (reservation.grant_state === "consumed") {
          return { kind: "grant_used" } as const;
        }
        const expectedClass =
          reservation.mode === "proposal" ? "proposal" : "effect";
        if (expectedClass !== command.actionClass) {
          return { kind: "policy_denied", code: "policy_disabled" } as const;
        }
        const lastActionAt = reservation.last_conversation_action_at
          ? new Date(reservation.last_conversation_action_at)
          : null;
        const decision = evaluateExternalBotPolicy({
          actionsToday: Number(reservation.actions_today),
          connectionActionsInLastMinute: Number(
            reservation.connection_actions_last_minute,
          ),
          connectionReady: reservation.connection_ready,
          humanTakeover: reservation.attendance_state !== "bot_active",
          policy: {
            action: command.command.action,
            channel: reservation.channel,
            connectionRatePerMinute: reservation.connection_rate_per_minute,
            cooldownSeconds: reservation.cooldown_seconds,
            dailyLimit: reservation.daily_limit,
            mode: reservation.mode,
          },
          secondsSinceLastAction: lastActionAt
            ? Math.max(
                0,
                (new Date(reservation.evaluated_at).getTime() -
                  lastActionAt.getTime()) /
                  1_000,
              )
            : null,
        });
        if (!decision.allowed) {
          return { kind: "policy_denied", code: decision.code } as const;
        }

        const consumed =
          await transaction.execute(sql`update crm_external_bot_grants
          set state='consumed', consumed_at=now(), revision=revision+1, updated_at=now()
          where id=${String(reservation.id)}::uuid and state='issued' and expires_at>now()
          returning id`);
        if ((consumed as unknown as ExternalBotRow[]).length !== 1) {
          return { kind: "grant_used" } as const;
        }

        const rows = await transaction.execute(sql`
          insert into crm_external_bot_action_commands
            (action_type, expected_attendance_revision, expected_revision, grant_id,
             idempotency_key, input, provider, provider_connection_id, request_digest,
             authorization_class, state, thread_id, store_id, tenant_id)
          values (${command.command.action}, ${command.expectedAttendanceRevision},
            ${command.expectedRevision}, ${String(reservation.id)}::uuid,
            ${command.idempotencyKey},
            ${JSON.stringify({ channel: command.channel, command: command.command, integrationId: command.integrationId, modelVersion: command.modelVersion })}::jsonb,
            ${command.provider}, ${command.connectionId}::uuid, ${command.requestDigest},
            ${command.actionClass === "proposal" ? "proposal_only" : "automatic"},
            'accepted', ${command.threadId}::uuid, ${command.storeId}::uuid,
            ${command.tenantId}::uuid)
          returning *`);
        const row = (rows as unknown as ExternalBotRow[])[0];
        return row
          ? { kind: "accepted", record: mapExternalBotCommand(row) }
          : { kind: "conflict" };
      }),
    transition: async (id, expected, state, failureCode) => {
      const rows = await db.execute(sql`
        update crm_external_bot_action_commands set state = ${state}, revision = revision + 1, updated_at = now(),
          input = case when ${failureCode ?? null}::text is null then input else jsonb_set(input, '{failureCode}', to_jsonb(${failureCode ?? null}::text), true) end
        where id = ${id}::uuid and state = any(${expected}::crm_external_bot_action_command_state[])
        returning *`);
      const row = (rows as unknown as ExternalBotRow[])[0];
      return row ? mapExternalBotCommand(row) : null;
    },
  };
}
async function loadReservation(
  db: ExternalBotDb,
  command: Parameters<ExternalBotManagerPorts["actionRepository"]["accept"]>[0],
  tokenDigest: string,
) {
  const rows =
    await db.execute(sql`select grant.*, grant.state as grant_state, now() as evaluated_at,
      policy.channel, policy.connection_rate_per_minute, policy.cooldown_seconds,
      policy.daily_limit, policy.mode, attendance.state as attendance_state,
      (connection.state='active'
        and coalesce((connection.metadata->>'connected')::boolean,false)
        and not coalesce((connection.metadata->>'degraded')::boolean,false)) as connection_ready,
      (select count(*) from crm_external_bot_action_commands minute_command
        where minute_command.tenant_id=grant.tenant_id and minute_command.store_id=grant.store_id
          and minute_command.provider_connection_id=grant.provider_connection_id
          and minute_command.created_at>=now()-interval '1 minute') as connection_actions_last_minute,
      (select count(*) from crm_external_bot_action_commands daily_command
        where daily_command.tenant_id=grant.tenant_id and daily_command.store_id=grant.store_id
          and daily_command.created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC') as actions_today,
      (select max(previous_command.created_at) from crm_external_bot_action_commands previous_command
        where previous_command.tenant_id=grant.tenant_id and previous_command.store_id=grant.store_id
          and previous_command.thread_id=grant.thread_id) as last_conversation_action_at
    from crm_external_bot_grants grant
    inner join tenants tenant on tenant.id=grant.tenant_id and tenant.deleted_at is null
    inner join stores store on store.id=grant.store_id and store.tenant_id=grant.tenant_id and store.deleted_at is null
    inner join crm_external_bot_policies policy on policy.tenant_id=grant.tenant_id
      and policy.store_id=grant.store_id and policy.channel=${command.channel}
      and policy.action_type=grant.action_type
    inner join crm_channel_connections connection on connection.id=grant.provider_connection_id
      and connection.tenant_id=grant.tenant_id and connection.store_id=grant.store_id
      and connection.provider=grant.provider and connection.channel=policy.channel
    inner join crm_conversation_threads thread on thread.id=grant.thread_id
      and thread.tenant_id=grant.tenant_id and thread.store_id=grant.store_id
      and thread.provider_connection_id=connection.id
    inner join crm_conversation_cycles cycle on cycle.thread_id=thread.id
      and cycle.tenant_id=thread.tenant_id and cycle.store_id=thread.store_id and cycle.state='active'
      and cycle.revision=${command.expectedRevision}
    inner join crm_conversation_attendances attendance on attendance.cycle_id=cycle.id
      and attendance.thread_id=thread.id and attendance.tenant_id=thread.tenant_id
      and attendance.store_id=thread.store_id and attendance.state_version=${command.expectedAttendanceRevision}
    where grant.token_digest=${tokenDigest} and grant.authorized_request_digest=${command.requestDigest}
      and grant.tenant_id=${command.tenantId}::uuid and grant.store_id=${command.storeId}::uuid
      and grant.integration_id=${command.integrationId}::uuid
      and grant.provider_connection_id=${command.connectionId}::uuid
      and grant.thread_id=${command.threadId}::uuid and grant.provider=${command.provider}
      and grant.model_version=${command.modelVersion} and grant.action_type=${command.command.action}
      and grant.action_class=${command.actionClass === "proposal" ? "proposal_only" : "automatic"}
    limit 1`);
  return (rows as unknown as ReservationRow[])[0] ?? null;
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
    sql`select * from crm_external_bot_action_commands where tenant_id=${input.tenantId}::uuid and store_id=${input.storeId}::uuid and idempotency_key=${input.idempotencyKey} limit 1`,
  );
  const row = (rows as unknown as ExternalBotRow[])[0];
  return row ? mapExternalBotCommand(row) : null;
}

function replayResult(
  record: ReturnType<typeof mapExternalBotCommand>,
  digest: string,
) {
  return record.requestDigest === digest
    ? ({ kind: "existing", record } as const)
    : ({ kind: "conflict" } as const);
}
