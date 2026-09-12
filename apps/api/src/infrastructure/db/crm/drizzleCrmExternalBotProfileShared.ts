import type { CrmExternalBotProfile } from "../../../domains/crm/ports/crmExternalBotProfileRepository.js";
import type { ExternalBotRow } from "./drizzleExternalBotShared.js";

export type ProfileRow = ExternalBotRow;

export const profileColumns = `profile.id, profile.created_at, profile.updated_at,
  profile.api_token_hash, profile.enabled, profile.is_default, profile.name,
  profile.secret_updated_at, profile.store_id, profile.tenant_id,
  profile.webhook_secret_hash, profile.webhook_secret_sealed, profile.webhook_url`;

export function mapProfile(row: ProfileRow): CrmExternalBotProfile {
  return {
    apiTokenConfigured: Boolean(readString(row.api_token_hash)),
    createdAt: readDate(row.created_at),
    enabled: row.enabled === true,
    id: String(row.id),
    isDefault: row.is_default === true,
    name: String(row.name),
    secretConfigured: Boolean(
      readString(row.webhook_secret_hash) &&
      readString(row.webhook_secret_sealed),
    ),
    secretUpdatedAt: readDate(row.secret_updated_at),
    storeId: String(row.store_id) as never,
    tenantId: String(row.tenant_id) as never,
    updatedAt: readDate(row.updated_at),
    webhookUrl: readString(row.webhook_url),
  };
}

export function readDate(value: unknown) {
  return value ? new Date(String(value)) : null;
}

export function readString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}
