import { sql } from "drizzle-orm";
import type {
  CrmExternalBotProfileRepository,
  UpdateCrmExternalBotProfileInput,
} from "../../../domains/crm/ports/crmExternalBotProfileRepository.js";
import type {
  ExternalBotDb,
  ExternalBotRow,
} from "./drizzleExternalBotShared.js";
import {
  mapProfile,
  profileColumns,
  readString,
} from "./drizzleCrmExternalBotProfileShared.js";

export async function createProfile(
  db: ExternalBotDb,
  input: Parameters<CrmExternalBotProfileRepository["createProfile"]>[0],
) {
  return db.transaction(async (transaction) => {
    if (input.isDefault) {
      await transaction.execute(sql`update crm_external_bot_profiles
        set is_default = false, updated_at = now()
        where tenant_id=${input.tenantId}::uuid and store_id=${input.storeId}::uuid
          and is_default = true`);
    }
    const rows =
      await transaction.execute(sql`insert into crm_external_bot_profiles
      (api_token_hash, enabled, is_default, name, secret_updated_at, store_id, tenant_id,
       webhook_secret_hash, webhook_secret_sealed, webhook_url)
      values (${input.apiTokenHash}, ${input.enabled}, ${input.isDefault}, ${input.name},
        ${input.secretUpdatedAt}, ${input.storeId}::uuid, ${input.tenantId}::uuid,
        ${input.webhookSecretHash}, ${input.webhookSecretSealed}, ${input.webhookUrl})
      returning ${sql.raw(profileColumns)}`);
    const row = (rows as unknown as ExternalBotRow[])[0];
    if (!row) throw new Error("CRM external bot profile create failed.");
    return mapProfile(row);
  });
}

export async function updateProfile(
  db: ExternalBotDb,
  input: UpdateCrmExternalBotProfileInput,
) {
  return db.transaction(async (transaction) => {
    if (input.isDefault === true) {
      await transaction.execute(sql`update crm_external_bot_profiles
        set is_default = false, updated_at = now()
        where tenant_id=${input.tenantId}::uuid and store_id=${input.storeId}::uuid
          and is_default = true and id <> ${input.profileId}::uuid`);
    }
    const assignments: string[] = ["updated_at = now()"];
    if (input.name !== undefined)
      assignments.push(`name = ${sql.param(input.name)}`);
    if (input.enabled !== undefined)
      assignments.push(`enabled = ${sql.param(input.enabled)}`);
    if (input.isDefault !== undefined)
      assignments.push(`is_default = ${sql.param(input.isDefault)}`);
    if (input.apiTokenHash !== undefined)
      assignments.push(`api_token_hash = ${sql.param(input.apiTokenHash)}`);
    if (input.webhookSecretHash !== undefined) {
      assignments.push(
        `webhook_secret_hash = ${sql.param(input.webhookSecretHash)}`,
      );
      assignments.push(
        `webhook_secret_sealed = ${sql.param(input.webhookSecretSealed ?? null)}`,
      );
      assignments.push(
        `secret_updated_at = ${sql.param(input.secretUpdatedAt ?? null)}`,
      );
    }
    if (input.webhookUrl !== undefined)
      assignments.push(`webhook_url = ${sql.param(input.webhookUrl)}`);
    const rows = await transaction.execute(sql`update crm_external_bot_profiles
      set ${sql.raw(assignments.join(", "))}
      where tenant_id=${input.tenantId}::uuid and store_id=${input.storeId}::uuid
        and id=${input.profileId}::uuid
      returning ${sql.raw(profileColumns)}`);
    const row = (rows as unknown as ExternalBotRow[])[0];
    return row ? mapProfile(row) : null;
  });
}
