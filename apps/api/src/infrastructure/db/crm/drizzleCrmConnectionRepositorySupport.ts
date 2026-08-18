import {
  and,
  eq,
  getTableColumns,
  gt,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import {
  providerConnections,
  storeEntitlements,
  stores,
  tenants,
} from "@lojaveiculosv2/db";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import {
  canonicalCrmConnectionIdentity,
  canonicalCrmConnectionMetadata,
  projectCanonicalCrmConnectionRow,
} from "../../../domains/crm/ports/crmChannelConnectionProjection.js";
import type {
  CrmConnection,
  CrmConnectionProvider,
  UpdateCrmConnectionInput,
} from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export function abandonedZapiConditions(cutoff: Date) {
  return and(
    eq(providerConnections.provider, "zapi"),
    eq(providerConnections.channel, "whatsapp"),
    eq(providerConnections.broker, "direct"),
    eq(providerConnections.state, "sandbox"),
    lte(providerConnections.updatedAt, cutoff),
    sql`not (${providerConnections.metadata} @> '{"supportHold":true}'::jsonb)`,
  );
}

export function activeCrmConnectionQuery(db: DrizzleCrmClient, now: Date) {
  return db
    .select(getTableColumns(providerConnections))
    .from(providerConnections)
    .innerJoin(
      stores,
      and(
        eq(stores.id, providerConnections.storeId),
        eq(stores.tenantId, providerConnections.tenantId),
        eq(stores.isDeleted, false),
        isNull(stores.deletedAt),
      ),
    )
    .innerJoin(
      tenants,
      and(
        eq(tenants.id, providerConnections.tenantId),
        eq(tenants.isDeleted, false),
        isNull(tenants.deletedAt),
      ),
    )
    .innerJoin(
      storeEntitlements,
      and(
        eq(storeEntitlements.storeId, providerConnections.storeId),
        eq(storeEntitlements.tenantId, providerConnections.tenantId),
        eq(storeEntitlements.featureKey, "crm"),
        or(
          eq(storeEntitlements.status, "active"),
          eq(storeEntitlements.status, "trialing"),
        ),
        or(
          isNull(storeEntitlements.startsAt),
          lte(storeEntitlements.startsAt, now),
        ),
        or(isNull(storeEntitlements.endsAt), gt(storeEntitlements.endsAt, now)),
      ),
    );
}

export function toCanonicalConnectionValues(input: {
  credentialsRef?: Record<string, unknown>;
  displayName: string;
  externalConnectionId?: string | null;
  externalInstanceId?: string | null;
  metadata?: Record<string, unknown>;
  phone?: string | null;
  provider: CrmConnectionProvider;
  status?: CrmConnection["status"];
  storeId: StoreId;
  tenantId: TenantId;
  webhookUrl?: string | null;
}) {
  const identity = canonicalCrmConnectionIdentity(input.provider);
  const status = input.status ?? "sandbox";
  const metadata = canonicalCrmConnectionMetadata({
    metadata: {
      ...(input.metadata ?? {}),
      credentialsRef: input.credentialsRef ?? {},
      phone: input.phone ?? null,
    },
    provider: input.provider,
    status,
  });
  return {
    broker: identity.credentialBroker,
    channel: identity.channel,
    displayName: input.displayName,
    externalConnectionId: input.externalConnectionId ?? null,
    externalInstanceId: input.externalInstanceId ?? null,
    metadata,
    provider: identity.provider,
    state: status,
    storeId: input.storeId,
    tenantId: input.tenantId,
    webhookUrl: input.webhookUrl ?? null,
  };
}

export function toCrmConnection(
  row: typeof providerConnections.$inferSelect,
): CrmConnection {
  const metadata = readRecord(row.metadata);
  return {
    canonical: projectCanonicalCrmConnectionRow({
      broker: row.broker,
      channel: row.channel,
      metadata,
      provider: row.provider,
      state: row.state,
    }),
    credentialsRef: readRecord(metadata.credentialsRef),
    displayName: row.displayName,
    externalConnectionId: row.externalConnectionId,
    externalInstanceId: row.externalInstanceId,
    id: row.id,
    metadata,
    phone: readString(metadata.phone),
    provider: connectionSetupProvider(row),
    status: row.state,
    storeId: row.storeId as StoreId,
    tenantId: row.tenantId as TenantId,
    webhookUrl: row.webhookUrl,
  };
}

export function canonicalProviderConditions(provider: CrmConnectionProvider) {
  const identity = canonicalCrmConnectionIdentity(provider);
  return and(
    eq(providerConnections.channel, identity.channel),
    eq(providerConnections.provider, identity.provider),
    eq(providerConnections.broker, identity.credentialBroker),
  );
}

export async function updateCanonicalCrmConnection(
  db: DrizzleCrmClient,
  input: UpdateCrmConnectionInput,
) {
  const [currentRow] = await db
    .select()
    .from(providerConnections)
    .where(
      and(
        eq(providerConnections.id, input.connectionId),
        eq(providerConnections.storeId, input.storeId),
        eq(providerConnections.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (!currentRow) return null;
  const current = toCrmConnection(currentRow);
  const next = toCanonicalConnectionValues({
    credentialsRef: input.credentialsRef ?? current.credentialsRef,
    displayName: input.displayName ?? current.displayName,
    externalConnectionId:
      input.externalConnectionId === undefined
        ? current.externalConnectionId
        : input.externalConnectionId,
    externalInstanceId:
      input.externalInstanceId === undefined
        ? current.externalInstanceId
        : input.externalInstanceId,
    metadata: input.metadata ?? current.metadata,
    phone: input.phone === undefined ? current.phone : input.phone,
    provider: current.provider,
    status: input.status ?? current.status,
    storeId: current.storeId,
    tenantId: current.tenantId,
    webhookUrl:
      input.webhookUrl === undefined ? current.webhookUrl : input.webhookUrl,
  });
  const [row] = await db
    .update(providerConnections)
    .set({
      displayName: next.displayName,
      externalConnectionId: next.externalConnectionId,
      externalInstanceId: next.externalInstanceId,
      metadata: next.metadata,
      state: next.state,
      updatedAt: new Date(),
      webhookUrl: next.webhookUrl,
    })
    .where(
      and(
        eq(providerConnections.id, input.connectionId),
        eq(providerConnections.storeId, input.storeId),
        eq(providerConnections.tenantId, input.tenantId),
      ),
    )
    .returning();
  return row ? toCrmConnection(row) : null;
}

export function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readConfiguredString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function connectionSetupProvider(
  row: Pick<
    typeof providerConnections.$inferSelect,
    "broker" | "channel" | "provider"
  >,
): CrmConnectionProvider {
  if (row.provider === "zapi" && row.channel === "whatsapp") return "zapi";
  if (row.provider === "olx" && row.channel === "olx_chat") return "olx_chat";
  if (row.provider === "meta_cloud" && row.broker === "composio") {
    return row.channel === "instagram"
      ? "composio_instagram"
      : "composio_whatsapp";
  }
  throw new Error("Unsupported canonical CRM channel connection identity.");
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
