import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@lojaveiculosv2/db";

type Db = PostgresJsDatabase<typeof schema>;

export interface ExternalBotProviderEffectExecutor {
  execute(input: {
    effectId: string;
    effectType: string;
    idempotencyKey: string;
    provider: string;
    providerConnectionId: string;
  }): Promise<
    | { kind: "succeeded"; externalEffectId: string }
    | { kind: "failed"; code: string; retryable: boolean }
    | { kind: "indeterminate"; code: string }
  >;
}

export type ExternalBotEffectAuthorization = (
  effectId: string,
) => Promise<boolean>;

export async function runExternalBotEffectWorkerOnce(input: {
  authorize: ExternalBotEffectAuthorization;
  db: Db;
  executor: ExternalBotProviderEffectExecutor;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const rows = await input.db
    .execute(sql`update provider_effects set state='claimed', attempt_count=attempt_count+1, updated_at=now()
    where id=(select id from provider_effects where state in ('accepted','retryable_failed') and next_attempt_at<=${now}
      order by next_attempt_at,created_at for update skip locked limit 1) returning *`);
  const row = (rows as unknown as Array<Record<string, unknown>>)[0];
  if (!row) return { kind: "idle" } as const;
  if (!(await input.authorize(String(row.id)))) {
    await input.db.execute(
      sql`update provider_effects set state='cancelled',last_error_code='authorization_revoked',updated_at=now() where id=${String(row.id)}::uuid and state='claimed'`,
    );
    await input.db.execute(
      sql`update bot_action_commands set state='cancelled',updated_at=now() where id=${String(row.command_id)}::uuid and state in ('executing','retryable_failed')`,
    );
    return { effectId: String(row.id), kind: "cancelled" } as const;
  }
  await input.db.execute(
    sql`update provider_effects set state='executing',updated_at=now() where id=${String(row.id)}::uuid and state='claimed'`,
  );
  await input.db.execute(
    sql`update bot_action_commands set state='executing',updated_at=now() where id=${String(row.command_id)}::uuid and state='retryable_failed'`,
  );
  const result = await input.executor.execute({
    effectId: String(row.id),
    effectType: String(row.effect_type),
    idempotencyKey: String(row.idempotency_key),
    provider: String(row.provider),
    providerConnectionId: String(row.provider_connection_id),
  });
  if (result.kind === "succeeded") {
    await finish(input.db, row, "completed", null, result.externalEffectId);
  } else if (result.kind === "indeterminate") {
    await finish(input.db, row, "indeterminate", result.code, null);
  } else if (result.retryable) {
    await input.db.execute(
      sql`update provider_effects set state='retryable_failed',last_error_code=${result.code},next_attempt_at=${new Date(now.getTime() + 30_000)},updated_at=now() where id=${String(row.id)}::uuid`,
    );
    await input.db.execute(
      sql`update bot_action_commands set state='retryable_failed',updated_at=now() where id=${String(row.command_id)}::uuid and state in ('executing','retryable_failed')`,
    );
  } else {
    await finish(input.db, row, "dead_letter", result.code, null);
  }
  return { effectId: String(row.id), kind: result.kind } as const;
}

async function finish(
  db: Db,
  row: Record<string, unknown>,
  state: "completed" | "dead_letter" | "indeterminate",
  code: string | null,
  externalId: string | null,
) {
  const effectState = state === "completed" ? "provider_succeeded" : state;
  await db.execute(
    sql`update provider_effects set state=${effectState},last_error_code=${code},external_effect_id=${externalId},updated_at=now() where id=${String(row.id)}::uuid`,
  );
  if (state === "completed") {
    await db.execute(
      sql`update provider_effects set state='completed',updated_at=now() where id=${String(row.id)}::uuid and state='provider_succeeded'`,
    );
    await db.execute(
      sql`update bot_action_commands set state='provider_succeeded',updated_at=now() where id=${String(row.command_id)}::uuid and state='executing'`,
    );
    await db.execute(
      sql`update bot_action_commands set state='completed',updated_at=now() where id=${String(row.command_id)}::uuid and state='provider_succeeded'`,
    );
  } else {
    await db.execute(
      sql`update bot_action_commands set state=${state},updated_at=now() where id=${String(row.command_id)}::uuid and state in ('executing','retryable_failed')`,
    );
  }
}
