import { providerConnections } from "@lojaveiculosv2/db";
import { and, eq, sql } from "drizzle-orm";
import type { CanonicalInboundMessageInput } from "../../../domains/crm/ports/crmCanonicalInboundRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function ensureCanonicalConnection(
  db: DrizzleCrmClient,
  input: CanonicalInboundMessageInput,
) {
  await db
    .insert(providerConnections)
    .values({
      broker: "direct",
      channel: input.channel,
      displayName: input.connectionDisplayName,
      id: input.connectionId,
      metadata: {
        canonicalizedBy: "provider_ingress",
        capabilities: input.connectionCapabilities,
      },
      provider: input.provider,
      state: "active",
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoNothing();
  const [connection] = await db
    .select({
      channel: providerConnections.channel,
      provider: providerConnections.provider,
    })
    .from(providerConnections)
    .where(
      and(
        eq(providerConnections.id, input.connectionId),
        eq(providerConnections.storeId, input.storeId),
        eq(providerConnections.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (
    !connection ||
    connection.channel !== input.channel ||
    connection.provider !== input.provider
  ) {
    throw new Error("Canonical CRM provider connection scope mismatch.");
  }
  await db
    .update(providerConnections)
    .set({
      metadata: sql`coalesce(${providerConnections.metadata}, '{}'::jsonb) || jsonb_build_object('capabilities', ${JSON.stringify(input.connectionCapabilities)}::jsonb)`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(providerConnections.id, input.connectionId),
        eq(providerConnections.storeId, input.storeId),
        eq(providerConnections.tenantId, input.tenantId),
        eq(providerConnections.channel, input.channel),
        eq(providerConnections.provider, input.provider),
      ),
    );
}
