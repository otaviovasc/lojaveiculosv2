import { and, eq, inArray, sql } from "drizzle-orm";
import { crmConnections } from "@lojaveiculosv2/db";
import type { CrmConnectionRepository } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  abandonedZapiConditions,
  activeCrmConnectionQuery,
  readRecord,
  toCrmConnection,
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
        .select({ id: crmConnections.id })
        .from(crmConnections)
        .where(abandonedZapiConditions(input.cutoff))
        .limit(input.limit);
      if (!eligible.length) return [];
      const rows = await db
        .update(crmConnections)
        .set({ status: "archived", updatedAt: new Date() })
        .where(
          and(
            inArray(
              crmConnections.id,
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
        .insert(crmConnections)
        .values({
          credentialsRef: input.credentialsRef ?? {},
          displayName: input.displayName,
          externalConnectionId: input.externalConnectionId ?? null,
          externalInstanceId: input.externalInstanceId ?? null,
          metadata: input.metadata ?? {},
          phone: input.phone ?? null,
          provider: input.provider,
          status: input.status ?? "sandbox",
          storeId: input.storeId,
          tenantId: input.tenantId,
          webhookUrl: input.webhookUrl ?? null,
        })
        .returning();
      if (!row) throw new Error("CRM connection insert returned no row.");
      return toCrmConnection(row);
    },
    async upsertOlxConnection(input) {
      return upsertOlxConnection(db, input);
    },
    async configureInitialZapiCredentials(input) {
      const [configured] = await db
        .update(crmConnections)
        .set({
          credentialsRef: input.credentialsRef,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(crmConnections.id, input.connectionId),
            eq(crmConnections.storeId, input.storeId),
            eq(crmConnections.tenantId, input.tenantId),
            eq(crmConnections.provider, "zapi"),
            sql`${crmConnections.status} <> 'archived'`,
            sql`coalesce(nullif(btrim(${crmConnections.credentialsRef}->'stored'->>'instanceId'), ''), '') = ''`,
            sql`coalesce(nullif(btrim(${crmConnections.credentialsRef}->'stored'->>'instanceToken'), ''), '') = ''`,
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
        .select({ credentialsRef: crmConnections.credentialsRef })
        .from(crmConnections)
        .where(
          and(
            eq(crmConnections.id, input.connectionId),
            eq(crmConnections.storeId, input.storeId),
            eq(crmConnections.tenantId, input.tenantId),
            eq(crmConnections.provider, "zapi"),
            sql`${crmConnections.status} <> 'archived'`,
          ),
        )
        .limit(1);
      if (!current) return { status: "not_found" };
      const stored = readRecord(readRecord(current.credentialsRef).stored);
      const instanceId = readConfiguredString(stored.instanceId);
      const instanceToken = readConfiguredString(stored.instanceToken);
      return {
        status:
          instanceId && instanceToken ? "already_configured" : "partial_state",
      };
    },
    async claimZapiWebhookSetup(input) {
      const [row] = await db
        .update(crmConnections)
        .set({
          metadata: sql`${crmConnections.metadata} || jsonb_build_object(
            'webhookSetup',
            coalesce(${crmConnections.metadata}->'webhookSetup', '{}'::jsonb) ||
            jsonb_build_object(
              'attemptCount', coalesce((${crmConnections.metadata}->'webhookSetup'->>'attemptCount')::integer, 0) + 1,
              'lastErrorCode', null,
              'leaseExpiresAt', ${input.leaseExpiresAt.toISOString()},
              'leaseOwner', ${input.leaseOwner},
              'status', 'configuring',
              'updatedAt', ${input.now.toISOString()}
            )
          )`,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(crmConnections.id, input.connectionId),
            eq(crmConnections.storeId, input.storeId),
            eq(crmConnections.tenantId, input.tenantId),
            eq(crmConnections.provider, "zapi"),
            sql`${crmConnections.status} <> 'archived'`,
            sql`coalesce(${crmConnections.metadata}->'webhookSetup'->>'status', '') <> 'configured'`,
            sql`(
              ${crmConnections.metadata}->'webhookSetup'->>'leaseOwner' is null
              or ${crmConnections.metadata}->'webhookSetup'->>'leaseExpiresAt' is null
              or (${crmConnections.metadata}->'webhookSetup'->>'leaseExpiresAt')::timestamptz <= ${input.now}
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
      const [row] = await db
        .update(crmConnections)
        .set({
          metadata: sql`${crmConnections.metadata} || jsonb_build_object(
            'webhookSetup',
            ${JSON.stringify(webhookSetup)}::jsonb
          )`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(crmConnections.id, input.connectionId),
            eq(crmConnections.storeId, input.storeId),
            eq(crmConnections.tenantId, input.tenantId),
            sql`${crmConnections.metadata}->'webhookSetup'->>'leaseOwner' = ${input.leaseOwner}`,
          ),
        )
        .returning();
      return row ? toCrmConnection(row) : null;
    },
    async finishOlxWebhookSetup(input) {
      return finishOlxWebhookSetup(db, input);
    },
    async findConnectionByExternalId(input) {
      const now = new Date();
      const [row] = await activeCrmConnectionQuery(db, now)
        .where(
          and(
            eq(crmConnections.externalConnectionId, input.externalConnectionId),
            inArray(crmConnections.provider, [...input.providers]),
          ),
        )
        .limit(1);
      return row ? toCrmConnection(row) : null;
    },
    async findConnectionById(connectionId) {
      const now = new Date();
      const [row] = await activeCrmConnectionQuery(db, now)
        .where(eq(crmConnections.id, connectionId))
        .limit(1);

      return row ? toCrmConnection(row) : null;
    },
    async listConnections(input) {
      const filters = [
        eq(crmConnections.storeId, input.storeId),
        eq(crmConnections.tenantId, input.tenantId),
      ];
      if (input.providers?.length) {
        filters.push(inArray(crmConnections.provider, [...input.providers]));
      }

      const rows = await db
        .select()
        .from(crmConnections)
        .where(and(...filters));

      return rows.map(toCrmConnection);
    },
    async updateConnection(input) {
      const [row] = await db
        .update(crmConnections)
        .set({
          ...(input.credentialsRef
            ? { credentialsRef: input.credentialsRef }
            : {}),
          ...(input.displayName ? { displayName: input.displayName } : {}),
          ...(input.externalConnectionId !== undefined
            ? { externalConnectionId: input.externalConnectionId }
            : {}),
          ...(input.externalInstanceId !== undefined
            ? { externalInstanceId: input.externalInstanceId }
            : {}),
          ...(input.metadata ? { metadata: input.metadata } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.webhookUrl !== undefined
            ? { webhookUrl: input.webhookUrl }
            : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(crmConnections.id, input.connectionId),
            eq(crmConnections.storeId, input.storeId),
            eq(crmConnections.tenantId, input.tenantId),
          ),
        )
        .returning();
      return row ? toCrmConnection(row) : null;
    },
  };
}
function readConfiguredString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}
