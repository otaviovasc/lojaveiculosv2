import { and, eq, sql } from "drizzle-orm";
import { crmConnections } from "@lojaveiculosv2/db";
import type { CrmConnectionRepository } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  readRecord,
  toCrmConnection,
} from "./drizzleCrmConnectionRepositorySupport.js";

export async function upsertOlxConnection(
  db: DrizzleCrmClient,
  input: Parameters<CrmConnectionRepository["upsertOlxConnection"]>[0],
) {
  const [row] = await db
    .insert(crmConnections)
    .values({
      credentialsRef: input.credentialsRef ?? {},
      displayName: input.displayName,
      externalConnectionId: input.externalConnectionId ?? null,
      metadata: input.metadata ?? {},
      provider: "olx_chat",
      status: input.status ?? "error",
      storeId: input.storeId,
      tenantId: input.tenantId,
      webhookUrl: input.webhookUrl ?? null,
    })
    .onConflictDoUpdate({
      set: {
        credentialsRef: input.credentialsRef ?? {},
        displayName: input.displayName,
        externalConnectionId: input.externalConnectionId ?? null,
        metadata: input.metadata ?? {},
        status: input.status ?? "error",
        updatedAt: new Date(),
        webhookUrl: input.webhookUrl ?? null,
      },
      target: [crmConnections.storeId, crmConnections.provider],
      targetWhere: sql`${crmConnections.status} <> 'archived' and ${crmConnections.provider} in ('zapi', 'composio_whatsapp', 'olx_chat')`,
    })
    .returning();
  if (!row) throw new Error("OLX CRM connection upsert returned no row.");
  return toCrmConnection(row);
}

export async function claimOlxWebhookSetup(
  db: DrizzleCrmClient,
  input: Parameters<
    NonNullable<CrmConnectionRepository["claimOlxWebhookSetup"]>
  >[0],
) {
  const [row] = await db
    .update(crmConnections)
    .set({
      metadata: sql`${crmConnections.metadata} || jsonb_build_object('webhookSetup', coalesce(${crmConnections.metadata}->'webhookSetup', '{}'::jsonb) || jsonb_build_object('attemptCount', coalesce((${crmConnections.metadata}->'webhookSetup'->>'attemptCount')::integer, 0) + 1, 'lastErrorCode', null, 'leaseExpiresAt', ${input.leaseExpiresAt.toISOString()}, 'leaseOwner', ${input.leaseOwner}, 'status', 'configuring', 'updatedAt', ${input.now.toISOString()}))`,
      updatedAt: input.now,
    })
    .where(
      and(
        eq(crmConnections.id, input.connectionId),
        eq(crmConnections.storeId, input.storeId),
        eq(crmConnections.tenantId, input.tenantId),
        eq(crmConnections.provider, "olx_chat"),
        sql`${crmConnections.status} <> 'archived'`,
        sql`coalesce(${crmConnections.metadata}->'webhookSetup'->>'status', '') <> 'configured'`,
        sql`(${crmConnections.metadata}->'webhookSetup'->>'leaseOwner' is null or ${crmConnections.metadata}->'webhookSetup'->>'leaseExpiresAt' is null or (${crmConnections.metadata}->'webhookSetup'->>'leaseExpiresAt')::timestamptz <= ${input.now})`,
      ),
    )
    .returning();
  return row ? toCrmConnection(row) : null;
}

export async function finishOlxWebhookSetup(
  db: DrizzleCrmClient,
  input: Parameters<
    NonNullable<CrmConnectionRepository["finishOlxWebhookSetup"]>
  >[0],
) {
  const setup = readRecord(input.metadata.webhookSetup);
  const [row] = await db
    .update(crmConnections)
    .set({
      metadata: sql`${crmConnections.metadata} || jsonb_build_object('webhookSetup', ${JSON.stringify(setup)}::jsonb)`,
      status: setup.status === "configured" ? "active" : "error",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(crmConnections.id, input.connectionId),
        eq(crmConnections.storeId, input.storeId),
        eq(crmConnections.tenantId, input.tenantId),
        eq(crmConnections.provider, "olx_chat"),
        sql`${crmConnections.metadata}->'webhookSetup'->>'leaseOwner' = ${input.leaseOwner}`,
      ),
    )
    .returning();
  return row ? toCrmConnection(row) : null;
}
