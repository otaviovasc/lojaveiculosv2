import { sql } from "drizzle-orm";
import type {
  ExternalBotDb,
  ExternalBotRow,
} from "./drizzleExternalBotShared.js";

export type PreparedExternalBotMedia = {
  contentType: string;
  originalUrl: string;
  publicUrl: string;
  sizeBytes: number;
  storageKey: string;
};

export async function persistPreparedExternalBotMedia(
  db: ExternalBotDb,
  input: PreparedExternalBotMedia & {
    effectId: string;
    storeId: string;
    tenantId: string;
  },
) {
  const preparedMedia = JSON.stringify({
    contentType: input.contentType,
    originalUrl: input.originalUrl,
    publicUrl: input.publicUrl,
    sizeBytes: input.sizeBytes,
    storageKey: input.storageKey,
  });
  const rows = await db.execute(sql`
    update crm_external_bot_provider_effects
    set result=result || jsonb_build_object('preparedMedia',${preparedMedia}::jsonb),
      updated_at=now()
    where id=${input.effectId}::uuid
      and tenant_id=${input.tenantId}::uuid
      and store_id=${input.storeId}::uuid
      and state in ('claimed','executing')
      and provider_attempted_at is null
      and result->'preparedMedia' is null
    returning id`);
  if ((rows as unknown as ExternalBotRow[]).length !== 1) {
    throw Object.assign(
      new Error("External bot media preparation could not be persisted."),
      { code: "media_preparation_conflict" },
    );
  }
}
