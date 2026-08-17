import { crmConnections, providerConnections } from "@lojaveiculosv2/db";
import { and, eq, inArray } from "drizzle-orm";
import type { CrmRoutingConnectionRepository } from "../../../domains/crm/ports/crmRoutingConnectionRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

type MappingInput = Parameters<
  CrmRoutingConnectionRepository["synchronizeLegacyConnections"]
>[0];

export async function synchronizeLegacyConnections(
  db: DrizzleCrmClient,
  input: MappingInput,
) {
  if (!input.connectionIds.length) return;
  const legacyRows = await scopedLegacyConnections(db, input);
  for (const legacy of legacyRows) {
    const canonical = toCanonicalConnection(legacy);
    const [existing] = await db
      .select({
        broker: providerConnections.broker,
        channel: providerConnections.channel,
        metadata: providerConnections.metadata,
        provider: providerConnections.provider,
      })
      .from(providerConnections)
      .where(eq(providerConnections.id, legacy.id))
      .limit(1);
    if (
      existing &&
      (existing.broker !== canonical.broker ||
        existing.channel !== canonical.channel ||
        existing.provider !== canonical.provider)
    ) {
      throw new Error("Canonical CRM connection identity mismatch.");
    }
    if (existing) {
      const existingMetadata = readRoutingRecord(existing.metadata);
      const legacySnapshot = legacyConnectionRoutingSnapshot(legacy);
      await db
        .update(providerConnections)
        .set({
          metadata: {
            ...existingMetadata,
            legacyConnectionId: legacy.id,
            ...(existingMetadata.capabilities === undefined
              ? { capabilities: legacySnapshot.capabilities }
              : {}),
            ...(existingMetadata.connected === undefined
              ? { connected: legacySnapshot.connected }
              : {}),
          },
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(providerConnections.id, legacy.id),
            eq(providerConnections.storeId, input.storeId),
            eq(providerConnections.tenantId, input.tenantId),
          ),
        );
    } else {
      await db.insert(providerConnections).values(canonical);
    }
  }
}

export async function verifyLegacyMappings(
  db: DrizzleCrmClient,
  input: MappingInput,
) {
  if (!input.connectionIds.length) return [];
  const ids = [...new Set(input.connectionIds)];
  const [legacyRows, canonicalRows] = await Promise.all([
    scopedLegacyConnections(db, input),
    db
      .select({
        broker: providerConnections.broker,
        channel: providerConnections.channel,
        id: providerConnections.id,
        provider: providerConnections.provider,
      })
      .from(providerConnections)
      .where(
        and(
          inArray(providerConnections.id, ids),
          eq(providerConnections.storeId, input.storeId),
          eq(providerConnections.tenantId, input.tenantId),
        ),
      ),
  ]);
  const canonicalById = new Map(canonicalRows.map((row) => [row.id, row]));
  return legacyRows
    .filter((legacy) => {
      const canonical = canonicalById.get(legacy.id);
      if (!canonical) return false;
      const expected = providerIdentity(legacy.provider);
      return (
        canonical.broker === expected.broker &&
        canonical.channel === expected.channel &&
        canonical.provider === expected.provider
      );
    })
    .map((row) => row.id);
}

function scopedLegacyConnections(db: DrizzleCrmClient, input: MappingInput) {
  return db
    .select()
    .from(crmConnections)
    .where(
      and(
        inArray(crmConnections.id, [...new Set(input.connectionIds)]),
        eq(crmConnections.storeId, input.storeId),
        eq(crmConnections.tenantId, input.tenantId),
      ),
    );
}

function toCanonicalConnection(
  row: typeof crmConnections.$inferSelect,
): typeof providerConnections.$inferInsert {
  const metadata = readRoutingRecord(row.metadata);
  const routingSnapshot = legacyConnectionRoutingSnapshot(row);
  return {
    ...providerIdentity(row.provider),
    displayName: row.displayName,
    externalConnectionId: row.externalConnectionId,
    externalInstanceId: row.externalInstanceId,
    id: row.id,
    metadata: {
      capabilities: routingSnapshot.capabilities,
      connected: routingSnapshot.connected,
      degraded: row.status === "error",
      errorCode: readRoutingString(metadata.errorCode),
      legacyConnectionId: row.id,
    },
    state: row.status,
    storeId: row.storeId,
    tenantId: row.tenantId,
    webhookUrl: row.webhookUrl,
  };
}

function providerIdentity(
  provider: typeof crmConnections.$inferSelect.provider,
) {
  if (provider === "zapi") {
    return { broker: "direct", channel: "whatsapp", provider: "zapi" } as const;
  }
  if (provider === "olx_chat") {
    return { broker: "direct", channel: "olx_chat", provider: "olx" } as const;
  }
  return {
    broker: "composio",
    channel: provider === "composio_instagram" ? "instagram" : "whatsapp",
    provider: "meta_cloud",
  } as const;
}

function isLegacyConnectionReady(row: typeof crmConnections.$inferSelect) {
  if (row.status !== "active") return false;
  const metadata = readRoutingRecord(row.metadata);
  if (row.provider === "zapi") {
    return readRoutingRecord(metadata.webhookSetup).status === "configured";
  }
  if (row.provider === "olx_chat") {
    const capabilities = readRoutingRecord(
      readRoutingRecord(metadata.webhookSetup).capabilities,
    );
    return readRoutingRecord(capabilities.chat).status === "active";
  }
  const composio = readRoutingRecord(
    readRoutingRecord(row.credentialsRef).composio,
  );
  return Boolean(
    row.externalConnectionId || readRoutingString(composio.connectedAccountId),
  );
}

function legacyConnectionRoutingSnapshot(
  row: typeof crmConnections.$inferSelect,
) {
  const connected = isLegacyConnectionReady(row);
  return {
    capabilities: {
      inbound: connected,
      outbound: connected,
      templates: connected && row.provider === "composio_whatsapp",
    },
    connected,
  };
}

export function readRoutingRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readRoutingString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
