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
  crmChannelConnections,
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
    eq(crmChannelConnections.provider, "zapi"),
    eq(crmChannelConnections.channel, "whatsapp"),
    eq(crmChannelConnections.broker, "direct"),
    eq(crmChannelConnections.state, "sandbox"),
    lte(crmChannelConnections.updatedAt, cutoff),
    sql`not (${crmChannelConnections.metadata} @> '{"supportHold":true}'::jsonb)`,
  );
}

export function activeCrmConnectionQuery(db: DrizzleCrmClient, now: Date) {
  return db
    .select(getTableColumns(crmChannelConnections))
    .from(crmChannelConnections)
    .innerJoin(
      stores,
      and(
        eq(stores.id, crmChannelConnections.storeId),
        eq(stores.tenantId, crmChannelConnections.tenantId),
        eq(stores.isDeleted, false),
        isNull(stores.deletedAt),
      ),
    )
    .innerJoin(
      tenants,
      and(
        eq(tenants.id, crmChannelConnections.tenantId),
        eq(tenants.isDeleted, false),
        isNull(tenants.deletedAt),
      ),
    )
    .innerJoin(
      storeEntitlements,
      and(
        eq(storeEntitlements.storeId, crmChannelConnections.storeId),
        eq(storeEntitlements.tenantId, crmChannelConnections.tenantId),
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
  broker: CrmConnection["broker"];
  channel: CrmConnection["channel"];
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
  const identity = canonicalCrmConnectionIdentity(input);
  const status = input.status ?? "sandbox";
  const metadata = canonicalCrmConnectionMetadata({
    metadata: {
      ...(input.metadata ?? {}),
      credentialsRef: input.credentialsRef ?? {},
      phone: input.phone ?? null,
    },
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
  row: typeof crmChannelConnections.$inferSelect,
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
    broker: row.broker,
    channel: row.channel,
    credentialsRef: readRecord(metadata.credentialsRef),
    displayName: row.displayName,
    externalConnectionId: row.externalConnectionId,
    externalInstanceId: row.externalInstanceId,
    id: row.id,
    metadata,
    phone: readString(metadata.phone),
    provider: row.provider,
    revision: row.revision,
    status: row.state,
    storeId: row.storeId as StoreId,
    tenantId: row.tenantId as TenantId,
    webhookUrl: row.webhookUrl,
  };
}

export function canonicalProviderConditions(input: {
  broker: CrmConnection["broker"];
  channel: CrmConnection["channel"];
  provider: CrmConnectionProvider;
}) {
  const identity = canonicalCrmConnectionIdentity(input);
  return and(
    eq(crmChannelConnections.channel, identity.channel),
    eq(crmChannelConnections.provider, identity.provider),
    eq(crmChannelConnections.broker, identity.credentialBroker),
  );
}

export async function updateCanonicalCrmConnection(
  db: DrizzleCrmClient,
  input: UpdateCrmConnectionInput,
) {
  const [currentRow] = await db
    .select()
    .from(crmChannelConnections)
    .where(
      and(
        eq(crmChannelConnections.id, input.connectionId),
        eq(crmChannelConnections.storeId, input.storeId),
        eq(crmChannelConnections.tenantId, input.tenantId),
        ...(input.expectedRevision === undefined
          ? []
          : [eq(crmChannelConnections.revision, input.expectedRevision)]),
      ),
    )
    .limit(1);
  if (!currentRow) return null;
  const current = toCrmConnection(currentRow);
  const next = toCanonicalConnectionValues({
    broker: current.broker,
    channel: current.channel,
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
    .update(crmChannelConnections)
    .set({
      displayName: next.displayName,
      externalConnectionId: next.externalConnectionId,
      externalInstanceId: next.externalInstanceId,
      metadata: next.metadata,
      state: next.state,
      revision: sql`${crmChannelConnections.revision} + 1`,
      updatedAt: new Date(),
      webhookUrl: next.webhookUrl,
    })
    .where(
      and(
        eq(crmChannelConnections.id, input.connectionId),
        eq(crmChannelConnections.storeId, input.storeId),
        eq(crmChannelConnections.tenantId, input.tenantId),
        ...(input.expectedRevision === undefined
          ? []
          : [eq(crmChannelConnections.revision, input.expectedRevision)]),
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

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
