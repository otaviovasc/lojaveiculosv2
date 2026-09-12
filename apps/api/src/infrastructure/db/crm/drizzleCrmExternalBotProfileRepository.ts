import { sql } from "drizzle-orm";
import type {
  CrmExternalBotProfileRepository,
  CrmExternalBotProfileScope,
} from "../../../domains/crm/ports/crmExternalBotProfileRepository.js";
import type { ExternalBotDb } from "./drizzleExternalBotShared.js";
import {
  createProfile,
  updateProfile,
} from "./drizzleCrmExternalBotProfileMutations.js";
import {
  mapProfile,
  profileColumns,
  readDate,
  readString,
  type ProfileRow,
} from "./drizzleCrmExternalBotProfileShared.js";

export function createDrizzleCrmExternalBotProfileRepository(
  db: ExternalBotDb,
): CrmExternalBotProfileRepository {
  return {
    listProfiles: (scope) => listProfiles(db, scope),
    findProfile: (input) => findProfile(db, input),
    findDefaultProfile: (scope) => findDefaultProfile(db, scope),
    findProfileByApiTokenHash: (input) =>
      findProfileByApiTokenHash(db, input.apiTokenHash),
    findProfileForConnection: (input) => findProfileForConnection(db, input),
    findProfileDeliveryConfig: (input) => findProfileDeliveryConfig(db, input),
    createProfile: (input) => createProfile(db, input),
    updateProfile: (input) => updateProfile(db, input),
    assignProfileToConnection: (input) => assignProfileToConnection(db, input),
    listConnectionProfileAssignments: (scope) =>
      listConnectionProfileAssignments(db, scope),
  };
}

async function listProfiles(
  db: ExternalBotDb,
  scope: CrmExternalBotProfileScope,
) {
  const rows = await db.execute(sql`select ${sql.raw(profileColumns)}
    from crm_external_bot_profiles profile
    where profile.tenant_id=${scope.tenantId}::uuid and profile.store_id=${scope.storeId}::uuid
    order by profile.created_at asc`);
  return (rows as unknown as ProfileRow[]).map(mapProfile);
}

async function findProfile(
  db: ExternalBotDb,
  input: CrmExternalBotProfileScope & { profileId: string },
) {
  const rows = await db.execute(sql`select ${sql.raw(profileColumns)}
    from crm_external_bot_profiles profile
    where profile.tenant_id=${input.tenantId}::uuid and profile.store_id=${input.storeId}::uuid
      and profile.id=${input.profileId}::uuid
    limit 1`);
  const row = (rows as unknown as ProfileRow[])[0];
  return row ? mapProfile(row) : null;
}

async function findDefaultProfile(
  db: ExternalBotDb,
  scope: CrmExternalBotProfileScope,
) {
  const rows = await db.execute(sql`select ${sql.raw(profileColumns)}
    from crm_external_bot_profiles profile
    where profile.tenant_id=${scope.tenantId}::uuid and profile.store_id=${scope.storeId}::uuid
      and profile.is_default = true
    limit 1`);
  const row = (rows as unknown as ProfileRow[])[0];
  return row ? mapProfile(row) : null;
}

async function findProfileByApiTokenHash(
  db: ExternalBotDb,
  apiTokenHash: string,
) {
  const rows = await db.execute(sql`select ${sql.raw(profileColumns)}
    from crm_external_bot_profiles profile
    inner join tenants tenant on tenant.id=profile.tenant_id and tenant.deleted_at is null
    inner join stores store on store.id=profile.store_id and store.tenant_id=profile.tenant_id and store.deleted_at is null
    inner join store_entitlements entitlement
      on entitlement.tenant_id=profile.tenant_id and entitlement.store_id=profile.store_id
      and entitlement.feature_key='crm' and entitlement.status='active'
      and (entitlement.starts_at is null or entitlement.starts_at <= now())
      and (entitlement.ends_at is null or entitlement.ends_at > now())
    where profile.api_token_hash=${apiTokenHash} and profile.enabled = true
    limit 2`);
  const matches = rows as unknown as ProfileRow[];
  return matches.length === 1 ? mapProfile(matches[0]!) : null;
}

async function findProfileForConnection(
  db: ExternalBotDb,
  input: CrmExternalBotProfileScope & { connectionId: string },
) {
  const rows = await db.execute(sql`select ${sql.raw(profileColumns)}
    from crm_channel_connections connection
    inner join crm_external_bot_profiles profile
      on profile.tenant_id=connection.tenant_id and profile.store_id=connection.store_id
      and profile.enabled = true
      and profile.id = coalesce(connection.external_bot_profile_id, (
        select default_profile.id from crm_external_bot_profiles default_profile
        where default_profile.tenant_id=connection.tenant_id
          and default_profile.store_id=connection.store_id
          and default_profile.is_default = true and default_profile.enabled = true
        limit 1
      ))
    where connection.id=${input.connectionId}::uuid
      and connection.tenant_id=${input.tenantId}::uuid
      and connection.store_id=${input.storeId}::uuid
      and connection.state <> 'archived'
    limit 1`);
  const row = (rows as unknown as ProfileRow[])[0];
  return row ? mapProfile(row) : null;
}

async function findProfileDeliveryConfig(
  db: ExternalBotDb,
  input: CrmExternalBotProfileScope & { connectionId: string },
) {
  const rows =
    await db.execute(sql`select profile.id as profile_id, profile.enabled,
      profile.webhook_secret_sealed, profile.webhook_url,
      connection.store_id, connection.tenant_id
    from crm_channel_connections connection
    inner join crm_external_bot_profiles profile
      on profile.tenant_id=connection.tenant_id and profile.store_id=connection.store_id
      and profile.enabled = true
      and profile.id = coalesce(connection.external_bot_profile_id, (
        select default_profile.id from crm_external_bot_profiles default_profile
        where default_profile.tenant_id=connection.tenant_id
          and default_profile.store_id=connection.store_id
          and default_profile.is_default = true and default_profile.enabled = true
        limit 1
      ))
    where connection.id=${input.connectionId}::uuid
      and connection.tenant_id=${input.tenantId}::uuid
      and connection.store_id=${input.storeId}::uuid
      and connection.state <> 'archived'
    limit 1`);
  const row = (rows as unknown as ProfileRow[])[0];
  if (!row) return null;
  return {
    enabled: row.enabled === true,
    profileId: String(row.profile_id),
    storeId: String(row.store_id) as never,
    tenantId: String(row.tenant_id) as never,
    webhookSecretSealed: readString(row.webhook_secret_sealed),
    webhookUrl: readString(row.webhook_url),
  };
}

async function assignProfileToConnection(
  db: ExternalBotDb,
  input: Parameters<
    CrmExternalBotProfileRepository["assignProfileToConnection"]
  >[0],
) {
  return db.transaction(async (transaction) => {
    if (input.profileId) {
      const profileRows = await transaction.execute(sql`select id
        from crm_external_bot_profiles
        where tenant_id=${input.tenantId}::uuid and store_id=${input.storeId}::uuid
          and id=${input.profileId}::uuid limit 1`);
      if ((profileRows as unknown as ProfileRow[]).length === 0) {
        return { kind: "profile_not_found" as const };
      }
    }
    const rows = await transaction.execute(sql`update crm_channel_connections
      set external_bot_profile_id=${input.profileId ? `${input.profileId}` : null}::uuid,
        updated_at = now()
      where tenant_id=${input.tenantId}::uuid and store_id=${input.storeId}::uuid
        and id=${input.connectionId}::uuid and state <> 'archived'
      returning id`);
    if ((rows as unknown as ProfileRow[]).length === 0) {
      return { kind: "connection_not_found" as const };
    }
    return { kind: "assigned" as const };
  });
}

async function listConnectionProfileAssignments(
  db: ExternalBotDb,
  scope: CrmExternalBotProfileScope,
) {
  const rows = await db.execute(sql`select id, external_bot_profile_id
    from crm_channel_connections
    where tenant_id=${scope.tenantId}::uuid and store_id=${scope.storeId}::uuid
      and state <> 'archived'
    order by created_at asc`);
  return (rows as unknown as ProfileRow[]).map((row) => ({
    connectionId: String(row.id),
    profileId: row.external_bot_profile_id
      ? String(row.external_bot_profile_id)
      : null,
  }));
}
