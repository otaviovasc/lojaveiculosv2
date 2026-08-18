import { and, eq, sql } from "drizzle-orm";
import { providerConnections } from "@lojaveiculosv2/db";
import { canonicalCrmConnectionMetadata } from "../../../domains/crm/ports/crmChannelConnectionProjection.js";
import type { CrmConnectionRepository } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  canonicalProviderConditions,
  readRecord,
  toCanonicalConnectionValues,
  toCrmConnection,
} from "./drizzleCrmConnectionRepositorySupport.js";

export async function upsertOlxConnection(
  db: DrizzleCrmClient,
  input: Parameters<CrmConnectionRepository["upsertOlxConnection"]>[0],
) {
  const [existing] = await db
    .select()
    .from(providerConnections)
    .where(
      and(
        eq(providerConnections.storeId, input.storeId),
        eq(providerConnections.tenantId, input.tenantId),
        canonicalProviderConditions("olx_chat"),
        sql`${providerConnections.state} <> 'archived'`,
      ),
    )
    .limit(1);
  if (
    existing &&
    existing.externalConnectionId === input.externalConnectionId &&
    input.externalConnectionId !== null
  ) {
    const current = toCrmConnection(existing);
    const currentStored = readRecord(current.credentialsRef.stored);
    const nextStored = readRecord(input.credentialsRef?.stored);
    const values = toCanonicalConnectionValues({
      ...input,
      credentialsRef: {
        stored: {
          ...nextStored,
          ...(currentStored.webhookSecret
            ? { webhookSecret: currentStored.webhookSecret }
            : {}),
        },
      },
      metadata: { ...current.metadata, ...(input.metadata ?? {}) },
      provider: "olx_chat",
      status: input.status ?? current.status,
    });
    const [updated] = await db
      .update(providerConnections)
      .set({
        displayName: values.displayName,
        metadata: values.metadata,
        state: values.state,
        updatedAt: new Date(),
        webhookUrl: values.webhookUrl,
      })
      .where(eq(providerConnections.id, existing.id))
      .returning();
    if (!updated) throw new Error("OLX CRM connection update returned no row.");
    return {
      connection: toCrmConnection(updated),
      replacedConnectionId: null,
    };
  }
  if (existing) {
    await db
      .update(providerConnections)
      .set({ state: "archived", updatedAt: new Date() })
      .where(
        and(
          eq(providerConnections.id, existing.id),
          eq(providerConnections.storeId, input.storeId),
          eq(providerConnections.tenantId, input.tenantId),
        ),
      );
  }
  const [created] = await db
    .insert(providerConnections)
    .values(
      toCanonicalConnectionValues({
        ...input,
        provider: "olx_chat",
        status: input.status ?? "error",
      }),
    )
    .returning();
  if (!created) throw new Error("OLX CRM connection insert returned no row.");
  return {
    connection: toCrmConnection(created),
    replacedConnectionId: existing?.id ?? null,
  };
}

export async function claimOlxWebhookSetup(
  db: DrizzleCrmClient,
  input: Parameters<
    NonNullable<CrmConnectionRepository["claimOlxWebhookSetup"]>
  >[0],
) {
  const [row] = await db
    .update(providerConnections)
    .set({
      metadata: sql`${providerConnections.metadata} || jsonb_build_object('connected', false, 'webhookSetup', coalesce(${providerConnections.metadata}->'webhookSetup', '{}'::jsonb) || jsonb_build_object('attemptCount', coalesce((${providerConnections.metadata}->'webhookSetup'->>'attemptCount')::integer, 0) + 1, 'lastErrorCode', null, 'leaseExpiresAt', ${input.leaseExpiresAt.toISOString()}::text, 'leaseOwner', ${input.leaseOwner}::text, 'status', 'configuring', 'updatedAt', ${input.now.toISOString()}::text))`,
      updatedAt: input.now,
    })
    .where(
      and(
        eq(providerConnections.id, input.connectionId),
        eq(providerConnections.storeId, input.storeId),
        eq(providerConnections.tenantId, input.tenantId),
        canonicalProviderConditions("olx_chat"),
        sql`${providerConnections.state} <> 'archived'`,
        sql`coalesce(${providerConnections.metadata}->'webhookSetup'->>'status', '') not in ('configured', 'indeterminate')`,
        sql`(${providerConnections.metadata}->'webhookSetup'->>'leaseOwner' is null or ${providerConnections.metadata}->'webhookSetup'->>'leaseExpiresAt' is null or (${providerConnections.metadata}->'webhookSetup'->>'leaseExpiresAt')::timestamptz <= ${input.now.toISOString()}::timestamptz)`,
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
  const status = ["configured", "partial"].includes(String(setup.status))
    ? ("active" as const)
    : ("error" as const);
  const projected = canonicalCrmConnectionMetadata({
    metadata: { webhookSetup: setup },
    provider: "olx_chat",
    status,
  });
  const [row] = await db
    .update(providerConnections)
    .set({
      metadata: sql`${providerConnections.metadata} || ${JSON.stringify({
        capabilities: projected.capabilities,
        connected: projected.connected,
        degraded: projected.degraded,
        errorCode: projected.errorCode,
        webhookSetup: setup,
      })}::jsonb`,
      state: status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(providerConnections.id, input.connectionId),
        eq(providerConnections.storeId, input.storeId),
        eq(providerConnections.tenantId, input.tenantId),
        canonicalProviderConditions("olx_chat"),
        sql`${providerConnections.metadata}->'webhookSetup'->>'leaseOwner' = ${input.leaseOwner}`,
      ),
    )
    .returning();
  return row ? toCrmConnection(row) : null;
}
