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
  const [existing] = await db
    .select()
    .from(crmConnections)
    .where(
      and(
        eq(crmConnections.storeId, input.storeId),
        eq(crmConnections.tenantId, input.tenantId),
        eq(crmConnections.provider, "olx_chat"),
        sql`${crmConnections.status} <> 'archived'`,
      ),
    )
    .limit(1);
  if (
    existing &&
    existing.externalConnectionId === input.externalConnectionId &&
    input.externalConnectionId !== null
  ) {
    const currentStored = readRecord(
      readRecord(existing.credentialsRef).stored,
    );
    const nextStored = readRecord(readRecord(input.credentialsRef).stored);
    const [updated] = await db
      .update(crmConnections)
      .set({
        credentialsRef: {
          stored: {
            ...nextStored,
            ...(currentStored.webhookSecret
              ? { webhookSecret: currentStored.webhookSecret }
              : {}),
          },
        },
        displayName: input.displayName,
        updatedAt: new Date(),
      })
      .where(eq(crmConnections.id, existing.id))
      .returning();
    if (!updated) throw new Error("OLX CRM connection update returned no row.");
    return {
      connection: toCrmConnection(updated),
      replacedConnectionId: null,
    };
  }
  if (existing) {
    await db
      .update(crmConnections)
      .set({ status: "archived", updatedAt: new Date() })
      .where(
        and(
          eq(crmConnections.id, existing.id),
          eq(crmConnections.storeId, input.storeId),
          eq(crmConnections.tenantId, input.tenantId),
        ),
      );
  }
  const [created] = await db
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
    .update(crmConnections)
    .set({
      metadata: sql`${crmConnections.metadata} || jsonb_build_object('webhookSetup', coalesce(${crmConnections.metadata}->'webhookSetup', '{}'::jsonb) || jsonb_build_object('attemptCount', coalesce((${crmConnections.metadata}->'webhookSetup'->>'attemptCount')::integer, 0) + 1, 'lastErrorCode', null, 'leaseExpiresAt', ${input.leaseExpiresAt.toISOString()}::text, 'leaseOwner', ${input.leaseOwner}::text, 'status', 'configuring', 'updatedAt', ${input.now.toISOString()}::text))`,
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
        sql`(${crmConnections.metadata}->'webhookSetup'->>'leaseOwner' is null or ${crmConnections.metadata}->'webhookSetup'->>'leaseExpiresAt' is null or (${crmConnections.metadata}->'webhookSetup'->>'leaseExpiresAt')::timestamptz <= ${input.now.toISOString()}::timestamptz)`,
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
      status: ["configured", "partial"].includes(String(setup.status))
        ? "active"
        : "error",
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
