import { and, eq, inArray, or, sql } from "drizzle-orm";
import { providerConnections } from "@lojaveiculosv2/db";
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
        .select({ id: providerConnections.id })
        .from(providerConnections)
        .where(abandonedZapiConditions(input.cutoff))
        .limit(input.limit);
      if (!eligible.length) return [];
      const rows = await db
        .update(providerConnections)
        .set({ state: "archived", updatedAt: new Date() })
        .where(
          and(
            inArray(
              providerConnections.id,
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
        .insert(providerConnections)
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
        .update(providerConnections)
        .set({
          externalInstanceId: input.externalInstanceId,
          metadata: sql`${providerConnections.metadata} || jsonb_build_object('credentialsRef', ${JSON.stringify(input.credentialsRef)}::jsonb)`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(providerConnections.id, input.connectionId),
            eq(providerConnections.storeId, input.storeId),
            eq(providerConnections.tenantId, input.tenantId),
            canonicalProviderConditions("zapi"),
            sql`${providerConnections.state} <> 'archived'`,
            sql`coalesce(nullif(btrim(${providerConnections.metadata}->'credentialsRef'->'stored'->>'instanceId'), ''), '') = ''`,
            sql`coalesce(nullif(btrim(${providerConnections.metadata}->'credentialsRef'->'stored'->>'instanceToken'), ''), '') = ''`,
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
        .select({ metadata: providerConnections.metadata })
        .from(providerConnections)
        .where(
          and(
            eq(providerConnections.id, input.connectionId),
            eq(providerConnections.storeId, input.storeId),
            eq(providerConnections.tenantId, input.tenantId),
            canonicalProviderConditions("zapi"),
            sql`${providerConnections.state} <> 'archived'`,
          ),
        )
        .limit(1);
      if (!current) return { status: "not_found" };
      const stored = readRecord(
        readRecord(readRecord(current.metadata).credentialsRef).stored,
      );
      const instanceId = readConfiguredString(stored.instanceId);
      const instanceToken = readConfiguredString(stored.instanceToken);
      return {
        status:
          instanceId && instanceToken ? "already_configured" : "partial_state",
      };
    },
    async claimZapiWebhookSetup(input) {
      const [row] = await db
        .update(providerConnections)
        .set({
          metadata: sql`${providerConnections.metadata} || jsonb_build_object(
            'connected', false,
            'webhookSetup',
            coalesce(${providerConnections.metadata}->'webhookSetup', '{}'::jsonb) ||
            jsonb_build_object(
              'attemptCount', coalesce((${providerConnections.metadata}->'webhookSetup'->>'attemptCount')::integer, 0) + 1,
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
            eq(providerConnections.id, input.connectionId),
            eq(providerConnections.storeId, input.storeId),
            eq(providerConnections.tenantId, input.tenantId),
            canonicalProviderConditions("zapi"),
            sql`${providerConnections.state} <> 'archived'`,
            ...(input.allowConfigured
              ? []
              : [
                  sql`coalesce(${providerConnections.metadata}->'webhookSetup'->>'status', '') <> 'configured'`,
                ]),
            sql`(
              ${providerConnections.metadata}->'webhookSetup'->>'leaseOwner' is null
              or ${providerConnections.metadata}->'webhookSetup'->>'leaseExpiresAt' is null
              or (${providerConnections.metadata}->'webhookSetup'->>'leaseExpiresAt')::timestamptz <= ${input.now.toISOString()}::timestamptz
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
        metadata: { webhookSetup },
        provider: "zapi",
        status: "sandbox",
      });
      const [row] = await db
        .update(providerConnections)
        .set({
          metadata: sql`${providerConnections.metadata} || ${JSON.stringify({
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
            eq(providerConnections.id, input.connectionId),
            eq(providerConnections.storeId, input.storeId),
            eq(providerConnections.tenantId, input.tenantId),
            canonicalProviderConditions("zapi"),
            sql`${providerConnections.metadata}->'webhookSetup'->>'leaseOwner' = ${input.leaseOwner}`,
          ),
        )
        .returning();
      return row ? toCrmConnection(row) : null;
    },
    async finishOlxWebhookSetup(input) {
      return finishOlxWebhookSetup(db, input);
    },
    async findConnectionByExternalId(input) {
      const [row] = await activeCrmConnectionQuery(db, new Date())
        .where(
          and(
            eq(
              providerConnections.externalConnectionId,
              input.externalConnectionId,
            ),
            or(...input.providers.map(canonicalProviderConditions)),
          ),
        )
        .limit(1);
      return row ? toCrmConnection(row) : null;
    },
    async findConnectionById(connectionId) {
      const [row] = await activeCrmConnectionQuery(db, new Date())
        .where(eq(providerConnections.id, connectionId))
        .limit(1);
      return row ? toCrmConnection(row) : null;
    },
    async listConnections(input) {
      const filters = [
        eq(providerConnections.storeId, input.storeId),
        eq(providerConnections.tenantId, input.tenantId),
      ];
      if (input.providers?.length) {
        filters.push(or(...input.providers.map(canonicalProviderConditions))!);
      }
      const rows = await db
        .select()
        .from(providerConnections)
        .where(and(...filters));
      return rows.map(toCrmConnection);
    },
    async updateConnection(input) {
      return updateCanonicalCrmConnection(db, input);
    },
  };
}
