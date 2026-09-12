import { and, eq, or, sql } from "drizzle-orm";
import { crmChannelConnections } from "@lojaveiculosv2/db";
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
    .from(crmChannelConnections)
    .where(
      and(
        eq(crmChannelConnections.storeId, input.storeId),
        eq(crmChannelConnections.tenantId, input.tenantId),
        olxConnectionConditions(),
        sql`${crmChannelConnections.state} <> 'archived'`,
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
      broker: current.broker,
      channel: current.channel,
      provider: current.provider,
      status: input.status ?? current.status,
    });
    const [updated] = await db
      .update(crmChannelConnections)
      .set({
        displayName: values.displayName,
        metadata: values.metadata,
        state: values.state,
        updatedAt: new Date(),
        webhookUrl: values.webhookUrl,
      })
      .where(eq(crmChannelConnections.id, existing.id))
      .returning();
    if (!updated) throw new Error("OLX CRM connection update returned no row.");
    return {
      connection: toCrmConnection(updated),
      replacedConnectionId: null,
    };
  }
  if (existing) {
    await db
      .update(crmChannelConnections)
      .set({ state: "archived", updatedAt: new Date() })
      .where(
        and(
          eq(crmChannelConnections.id, existing.id),
          eq(crmChannelConnections.storeId, input.storeId),
          eq(crmChannelConnections.tenantId, input.tenantId),
        ),
      );
  }
  const [created] = await db
    .insert(crmChannelConnections)
    .values(
      toCanonicalConnectionValues({
        ...input,
        broker: "direct",
        channel: "olx_chat",
        provider: "olx",
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
    .update(crmChannelConnections)
    .set({
      metadata: sql`${crmChannelConnections.metadata} || jsonb_build_object('connected', false, 'webhookSetup', coalesce(${crmChannelConnections.metadata}->'webhookSetup', '{}'::jsonb) || jsonb_build_object('attemptCount', coalesce((${crmChannelConnections.metadata}->'webhookSetup'->>'attemptCount')::integer, 0) + 1, 'lastErrorCode', null, 'leaseExpiresAt', ${input.leaseExpiresAt.toISOString()}::text, 'leaseOwner', ${input.leaseOwner}::text, 'status', 'configuring', 'updatedAt', ${input.now.toISOString()}::text))`,
      updatedAt: input.now,
    })
    .where(
      and(
        eq(crmChannelConnections.id, input.connectionId),
        eq(crmChannelConnections.storeId, input.storeId),
        eq(crmChannelConnections.tenantId, input.tenantId),
        olxConnectionConditions(),
        sql`${crmChannelConnections.state} <> 'archived'`,
        sql`coalesce(${crmChannelConnections.metadata}->'webhookSetup'->>'status', '') not in ('configured', 'indeterminate')`,
        sql`(${crmChannelConnections.metadata}->'webhookSetup'->>'leaseOwner' is null or ${crmChannelConnections.metadata}->'webhookSetup'->>'leaseExpiresAt' is null or (${crmChannelConnections.metadata}->'webhookSetup'->>'leaseExpiresAt')::timestamptz <= ${input.now.toISOString()}::timestamptz)`,
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
    metadata: input.metadata,
  });
  const [row] = await db
    .update(crmChannelConnections)
    .set({
      metadata: sql`${crmChannelConnections.metadata} || ${JSON.stringify({
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
        eq(crmChannelConnections.id, input.connectionId),
        eq(crmChannelConnections.storeId, input.storeId),
        eq(crmChannelConnections.tenantId, input.tenantId),
        olxConnectionConditions(),
        sql`${crmChannelConnections.metadata}->'webhookSetup'->>'leaseOwner' = ${input.leaseOwner}`,
      ),
    )
    .returning();
  return row ? toCrmConnection(row) : null;
}

function olxConnectionConditions() {
  return or(
    canonicalProviderConditions({
      broker: "direct",
      channel: "olx_chat",
      provider: "olx",
    }),
    canonicalProviderConditions({
      broker: "composio",
      channel: "olx_chat",
      provider: "olx",
    }),
  );
}
