import { and, eq, inArray, sql } from "drizzle-orm";
import { crmChannelConnections } from "@lojaveiculosv2/db";
import { canonicalCrmConnectionMetadata } from "../../../domains/crm/ports/crmChannelConnectionProjection.js";
import type { CrmConnectionRepository } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  abandonedZapiConditions,
  activeCrmConnectionQuery,
  canonicalProviderConditions,
  readConfiguredString,
  readRecord,
  toCanonicalConnectionValues,
  toCrmConnection,
  updateCanonicalCrmConnection,
} from "./drizzleCrmConnectionRepositorySupport.js";
import {
  claimOlxWebhookSetup,
  finishOlxWebhookSetup,
  upsertOlxConnection,
} from "./drizzleCrmOlxConnectionSetup.js";

export function createDrizzleCrmConnectionRepository(
  db: DrizzleCrmClient,
): CrmConnectionRepository {
  return {
    async archiveAbandonedZapiConnections(input) {
      const eligible = await db
        .select({ id: crmChannelConnections.id })
        .from(crmChannelConnections)
        .where(abandonedZapiConditions(input.cutoff))
        .limit(input.limit);
      if (!eligible.length) return [];
      const rows = await db
        .update(crmChannelConnections)
        .set({ state: "archived", updatedAt: new Date() })
        .where(
          and(
            inArray(
              crmChannelConnections.id,
              eligible.map((item) => item.id),
            ),
            abandonedZapiConditions(input.cutoff),
          ),
        )
        .returning();
      return rows.map(toCrmConnection);
    },
    async createConnection(input) {
      const [row] = await db
        .insert(crmChannelConnections)
        .values(toCanonicalConnectionValues(input))
        .returning();
      if (!row)
        throw new Error("CRM channel connection insert returned no row.");
      return toCrmConnection(row);
    },
    async upsertOlxConnection(input) {
      return upsertOlxConnection(db, input);
    },
    async configureInitialZapiCredentials(input) {
      const [configured] = await db
        .update(crmChannelConnections)
        .set({
          externalInstanceId: null,
          metadata: sql`${crmChannelConnections.metadata} || jsonb_build_object('credentialsRef', ${JSON.stringify(input.credentialsRef)}::jsonb)`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(crmChannelConnections.id, input.connectionId),
            eq(crmChannelConnections.storeId, input.storeId),
            eq(crmChannelConnections.tenantId, input.tenantId),
            canonicalProviderConditions(ZAPI_CONNECTION_IDENTITY),
            sql`${crmChannelConnections.state} <> 'archived'`,
            sql`coalesce(nullif(btrim(${crmChannelConnections.metadata}->'credentialsRef'->'stored'->>'instanceId'), ''), '') = ''`,
            sql`coalesce(nullif(btrim(${crmChannelConnections.metadata}->'credentialsRef'->'stored'->>'instanceToken'), ''), '') = ''`,
            sql`coalesce(nullif(btrim(${crmChannelConnections.metadata}->'credentialsRef'->'stored'->>'clientToken'), ''), '') = ''`,
          ),
        )
        .returning();
      if (configured) {
        return {
          connection: toCrmConnection(configured),
          status: "configured",
        };
      }
      const [current] = await db
        .select({ metadata: crmChannelConnections.metadata })
        .from(crmChannelConnections)
        .where(
          and(
            eq(crmChannelConnections.id, input.connectionId),
            eq(crmChannelConnections.storeId, input.storeId),
            eq(crmChannelConnections.tenantId, input.tenantId),
            canonicalProviderConditions(ZAPI_CONNECTION_IDENTITY),
            sql`${crmChannelConnections.state} <> 'archived'`,
          ),
        )
        .limit(1);
      if (!current) return { status: "not_found" };
      const stored = readRecord(
        readRecord(readRecord(current.metadata).credentialsRef).stored,
      );
      const instanceId = readConfiguredString(stored.instanceId);
      const instanceToken = readConfiguredString(stored.instanceToken);
      const clientToken = readConfiguredString(stored.clientToken);
      return {
        status:
          clientToken && instanceId && instanceToken
            ? "already_configured"
            : "partial_state",
      };
    },
    async claimZapiWebhookSetup(input) {
      const [row] = await db
        .update(crmChannelConnections)
        .set({
          metadata: sql`${crmChannelConnections.metadata} || jsonb_build_object(
            'connected', false,
            'webhookSetup',
            coalesce(${crmChannelConnections.metadata}->'webhookSetup', '{}'::jsonb) ||
            jsonb_build_object(
              'attemptCount', coalesce((${crmChannelConnections.metadata}->'webhookSetup'->>'attemptCount')::integer, 0) + 1,
              'lastErrorCode', null,
              'leaseExpiresAt', ${input.leaseExpiresAt.toISOString()}::text,
              'leaseOwner', ${input.leaseOwner}::text,
              'status', 'configuring',
              'updatedAt', ${input.now.toISOString()}::text
            )
          )`,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(crmChannelConnections.id, input.connectionId),
            eq(crmChannelConnections.storeId, input.storeId),
            eq(crmChannelConnections.tenantId, input.tenantId),
            canonicalProviderConditions(ZAPI_CONNECTION_IDENTITY),
            sql`${crmChannelConnections.state} <> 'archived'`,
            ...(input.allowConfigured
              ? []
              : [
                  sql`coalesce(${crmChannelConnections.metadata}->'webhookSetup'->>'status', '') <> 'configured'`,
                ]),
            sql`(
              ${crmChannelConnections.metadata}->'webhookSetup'->>'leaseOwner' is null
              or ${crmChannelConnections.metadata}->'webhookSetup'->>'leaseExpiresAt' is null
              or (${crmChannelConnections.metadata}->'webhookSetup'->>'leaseExpiresAt')::timestamptz <= ${input.now.toISOString()}::timestamptz
            )`,
          ),
        )
        .returning();
      return row ? toCrmConnection(row) : null;
    },
    async claimOlxWebhookSetup(input) {
      return claimOlxWebhookSetup(db, input);
    },
    async finishZapiWebhookSetup(input) {
      const webhookSetup = readRecord(input.metadata.webhookSetup);
      const projected = canonicalCrmConnectionMetadata({
        metadata: input.metadata,
      });
      const [row] = await db
        .update(crmChannelConnections)
        .set({
          metadata: sql`${crmChannelConnections.metadata} || ${JSON.stringify({
            capabilities: projected.capabilities,
            connected: false,
            degraded: projected.degraded,
            errorCode: projected.errorCode,
            webhookSetup,
          })}::jsonb`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(crmChannelConnections.id, input.connectionId),
            eq(crmChannelConnections.storeId, input.storeId),
            eq(crmChannelConnections.tenantId, input.tenantId),
            canonicalProviderConditions(ZAPI_CONNECTION_IDENTITY),
            sql`${crmChannelConnections.metadata}->'webhookSetup'->>'leaseOwner' = ${input.leaseOwner}`,
          ),
        )
        .returning();
      return row ? toCrmConnection(row) : null;
    },
    async finishOlxWebhookSetup(input) {
      return finishOlxWebhookSetup(db, input);
    },
    async findConnectionByExternalId(input) {
      if (!input.channels.length || !input.providers.length) return null;
      const [row] = await activeCrmConnectionQuery(db, new Date())
        .where(
          and(
            eq(
              crmChannelConnections.externalConnectionId,
              input.externalConnectionId,
            ),
            inArray(crmChannelConnections.channel, input.channels),
            inArray(crmChannelConnections.provider, input.providers),
            ...(input.brokers?.length
              ? [inArray(crmChannelConnections.broker, input.brokers)]
              : []),
          ),
        )
        .limit(1);
      return row ? toCrmConnection(row) : null;
    },
    async findConnectionById(connectionId) {
      const [row] = await activeCrmConnectionQuery(db, new Date())
        .where(eq(crmChannelConnections.id, connectionId))
        .limit(1);
      return row ? toCrmConnection(row) : null;
    },
    async listConnections(input) {
      const filters = [
        eq(crmChannelConnections.storeId, input.storeId),
        eq(crmChannelConnections.tenantId, input.tenantId),
      ];
      if (input.providers?.length) {
        filters.push(inArray(crmChannelConnections.provider, input.providers));
      }
      if (input.channels?.length) {
        filters.push(inArray(crmChannelConnections.channel, input.channels));
      }
      if (input.brokers?.length) {
        filters.push(inArray(crmChannelConnections.broker, input.brokers));
      }
      const rows = await db
        .select()
        .from(crmChannelConnections)
        .where(and(...filters));
      return rows.map(toCrmConnection);
    },
    async updateConnection(input) {
      return updateCanonicalCrmConnection(db, input);
    },
  };
}

const ZAPI_CONNECTION_IDENTITY = {
  broker: "direct",
  channel: "whatsapp",
  provider: "zapi",
} as const;
