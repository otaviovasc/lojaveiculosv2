import { sql } from "drizzle-orm";
import type { ExternalBotManagerPorts } from "../../../domains/crm/bot/ports/externalBotPorts.js";
import type { ExternalBotDb } from "./drizzleExternalBotShared.js";

type PolicyRow = {
  actions_today: number | string;
  channel: "instagram" | "olx_chat" | "whatsapp";
  connection_actions_last_minute: number | string;
  connection_rate_per_minute: number;
  connection_ready: boolean;
  cooldown_seconds: number;
  daily_limit: number;
  last_action_at: Date | string | null;
  mode: "auto" | "disabled" | "proposal";
};

export function createExternalBotPolicyResolver(
  db: ExternalBotDb,
  now: () => Date = () => new Date(),
): ExternalBotManagerPorts["policyResolver"] {
  return {
    async resolve(scope, action) {
      const evaluatedAt = now();
      const rows = await db.execute(sql`
        select policy.channel, policy.connection_rate_per_minute,
          policy.cooldown_seconds, policy.daily_limit, policy.mode,
          (connection.state = 'active'
            and coalesce((connection.metadata->>'connected')::boolean, false)
            and not coalesce((connection.metadata->>'degraded')::boolean, false)) as connection_ready,
          (select count(*) from crm_external_bot_action_commands minute_command
            where minute_command.tenant_id = policy.tenant_id
              and minute_command.store_id = policy.store_id
              and minute_command.provider_connection_id = ${scope.connectionId}::uuid
              and minute_command.created_at >= ${new Date(evaluatedAt.getTime() - 60_000)})
          ) as connection_actions_last_minute,
          (select count(*) from crm_external_bot_action_commands daily_command
            where daily_command.tenant_id = policy.tenant_id
              and daily_command.store_id = policy.store_id
              and daily_command.created_at >= date_trunc('day', ${evaluatedAt}::timestamptz at time zone 'UTC') at time zone 'UTC'
          ) as actions_today,
          (select max(previous_command.created_at) from crm_external_bot_action_commands previous_command
            where previous_command.tenant_id = policy.tenant_id
              and previous_command.store_id = policy.store_id
              and previous_command.thread_id = ${scope.threadId}::uuid
          ) as last_action_at
        from crm_external_bot_policies policy
        inner join tenants tenant on tenant.id=policy.tenant_id and tenant.deleted_at is null
        inner join stores store on store.id=policy.store_id and store.tenant_id=policy.tenant_id and store.deleted_at is null
        inner join crm_channel_connections connection
          on connection.id = ${scope.connectionId}::uuid
          and connection.tenant_id = policy.tenant_id
          and connection.store_id = policy.store_id
          and connection.channel = policy.channel
        where policy.tenant_id = ${scope.tenantId}::uuid
          and policy.store_id = ${scope.storeId}::uuid
          and policy.channel = ${scope.channel}
          and policy.action_type = ${action}
        limit 1`);
      const row = (rows as unknown as PolicyRow[])[0];
      if (!row) return null;
      const lastActionAt = row.last_action_at
        ? new Date(row.last_action_at)
        : null;
      return {
        actionsToday: Number(row.actions_today),
        connectionActionsInLastMinute: Number(
          row.connection_actions_last_minute,
        ),
        connectionReady: row.connection_ready,
        policy: {
          action,
          channel: row.channel,
          connectionRatePerMinute: row.connection_rate_per_minute,
          cooldownSeconds: row.cooldown_seconds,
          dailyLimit: row.daily_limit,
          mode: row.mode,
        },
        secondsSinceLastAction: lastActionAt
          ? Math.max(
              0,
              (evaluatedAt.getTime() - lastActionAt.getTime()) / 1_000,
            )
          : null,
      };
    },
  };
}
