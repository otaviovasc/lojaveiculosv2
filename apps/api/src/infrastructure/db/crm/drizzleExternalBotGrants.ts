import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import type { ExternalBotManagerPorts } from "../../../domains/crm/bot/ports/externalBotPorts.js";
import {
  type ExternalBotDb,
  type ExternalBotRow,
} from "./drizzleExternalBotShared.js";

export function createExternalBotGrantStore(
  input: { db: ExternalBotDb; modelVersion: string },
  digest: (value: string) => string,
): ExternalBotManagerPorts["grantStore"] {
  return {
    issue: async (grant) => {
      if (grant.modelVersion !== input.modelVersion) {
        throw new Error("External bot model version is not approved.");
      }
      const token = randomBytes(32).toString("base64url");
      const providerRows = await input.db.execute(sql`
        select connection.channel, connection.provider
        from crm_channel_connections connection
        where connection.id=${grant.connectionId}::uuid
          and connection.tenant_id=${grant.tenantId}::uuid
          and connection.store_id=${grant.storeId}::uuid
          and exists (
            select 1 from crm_channel_routing_policies routing
            where routing.tenant_id=connection.tenant_id
              and routing.store_id=connection.store_id
              and routing.channel=connection.channel
              and routing.external_bot_mode <> 'disabled'
              and (
                (routing.external_bot_mode='inherit_store_default'
                  and routing.default_connection_id=connection.id)
                or (routing.external_bot_mode='explicit_connection'
                  and routing.external_bot_connection_id=connection.id)
              )
          )
        limit 1`);
      const connection = (providerRows as unknown as ExternalBotRow[])[0];
      const provider = connection?.provider;
      if (!provider || connection?.channel !== grant.channel) {
        throw new Error("External bot provider connection is unavailable.");
      }
      const actionClass = grant.actionClass;
      await input.db.execute(sql`
        insert into crm_external_bot_grants
          (action_class, action_type, bot_key, expires_at, integration_id, model_version, provider,
           provider_connection_id, request_digest, token_digest, authorized_request_digest, state, thread_id, store_id, tenant_id, workflow_provider)
        values (${actionClass === "proposal" ? "proposal_only" : "automatic"}, ${grant.action},
          ${grant.integrationId}, ${grant.expiresAt}, ${grant.integrationId}::uuid, ${grant.modelVersion}, ${provider},
          ${grant.connectionId}::uuid, ${grant.authorizedRequestDigest}, ${digest(token)}, ${grant.authorizedRequestDigest}, 'issued', ${grant.threadId}::uuid,
          ${grant.storeId}::uuid, ${grant.tenantId}::uuid, 'external_bot')`);
      return { ...grant, actionClass, provider: provider as never, token };
    },
    consume: async (grant) => {
      const rows = await input.db.execute(sql`
        update crm_external_bot_grants set state = 'consumed', consumed_at = ${grant.now}, authorized_request_digest=${grant.requestDigest},
          revision = revision + 1, updated_at = now()
        where token_digest = ${digest(grant.token)} and tenant_id = ${grant.tenantId}::uuid
          and store_id = ${grant.storeId}::uuid and integration_id = ${grant.integrationId}::uuid
          and provider_connection_id = ${grant.connectionId}::uuid and thread_id = ${grant.threadId}::uuid
          and action_type = ${grant.action} and action_class = ${grant.actionClass === "proposal" ? "proposal_only" : "automatic"}
          and model_version = ${grant.modelVersion} and authorized_request_digest=${grant.requestDigest}
          and state = 'issued' and expires_at > ${grant.now}
          and exists (
            select 1 from crm_channel_connections connection
            where connection.id=provider_connection_id
              and connection.provider=${grant.provider}
              and connection.channel=${grant.channel}
              and exists (
                select 1 from crm_channel_routing_policies routing
                where routing.tenant_id=connection.tenant_id
                  and routing.store_id=connection.store_id
                  and routing.channel=connection.channel
                  and routing.external_bot_mode <> 'disabled'
                  and (
                    (routing.external_bot_mode='inherit_store_default'
                      and routing.default_connection_id=connection.id)
                    or (routing.external_bot_mode='explicit_connection'
                      and routing.external_bot_connection_id=connection.id)
                  )
              )
          )
        returning id`);
      if ((rows as unknown as ExternalBotRow[]).length > 0) return "consumed";
      const found = await input.db.execute(
        sql`select state from crm_external_bot_grants where token_digest = ${digest(grant.token)} limit 1`,
      );
      return (found as unknown as ExternalBotRow[])[0]?.state === "consumed"
        ? "used"
        : "invalid";
    },
  };
}
