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
        await db.execute(sql`select account.id, account.store_id, account.tenant_id
          from integration_accounts account
          inner join tenants tenant on tenant.id=account.tenant_id and tenant.deleted_at is null
          inner join stores store on store.id=account.store_id and store.tenant_id=account.tenant_id and store.deleted_at is null
          inner join store_entitlements entitlement
            on entitlement.tenant_id=account.tenant_id and entitlement.store_id=account.store_id
            and entitlement.feature_key='crm' and entitlement.status='active'
            and (entitlement.starts_at is null or entitlement.starts_at <= now())
            and (entitlement.ends_at is null or entitlement.ends_at > now())
          where account.provider='crm_external_bot' and account.status='active'
            and account.config ->> 'externalBotApiBearerHash' = ${digest(credential)} limit 2`);
      const matches = rows as unknown as ExternalBotRow[];
      if (matches.length !== 1) return null;
      return {
        integrationId: String(matches[0]!.id),
        storeId: String(matches[0]!.store_id),
        tenantId: String(matches[0]!.tenant_id),
      };
    },
  };
}
