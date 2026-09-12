import { sql } from "drizzle-orm";
import type { ExternalBotManagerPorts } from "../../../domains/crm/bot/ports/externalBotPorts.js";
import {
  type ExternalBotDb,
  type ExternalBotRow,
} from "./drizzleExternalBotShared.js";

export function createExternalBotActionAuthenticator(
  db: ExternalBotDb,
  digest: (value: string) => string,
): ExternalBotManagerPorts["actionAuthenticator"] {
  return {
    authenticate: async (credential) => {
      const rows =
        await db.execute(sql`select profile.id, profile.store_id, profile.tenant_id
          from crm_external_bot_profiles profile
          inner join tenants tenant on tenant.id=profile.tenant_id and tenant.deleted_at is null
          inner join stores store on store.id=profile.store_id and store.tenant_id=profile.tenant_id and store.deleted_at is null
          inner join store_entitlements entitlement
            on entitlement.tenant_id=profile.tenant_id and entitlement.store_id=profile.store_id
            and entitlement.feature_key='crm' and entitlement.status='active'
            and (entitlement.starts_at is null or entitlement.starts_at <= now())
            and (entitlement.ends_at is null or entitlement.ends_at > now())
           where profile.enabled=true and profile.api_token_hash = ${digest(credential)}
             limit 1`);
      const matches = rows as unknown as ExternalBotRow[];
      if (matches.length !== 1) return null;
      return {
        integrationId: String(matches[0]!.id),
        profileId: String(matches[0]!.id),
        storeId: String(matches[0]!.store_id),
        tenantId: String(matches[0]!.tenant_id),
      };
    },
  };
}
