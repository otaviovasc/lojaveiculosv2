import { providerConnections } from "@lojaveiculosv2/db";
import { and, eq } from "drizzle-orm";
import { projectCanonicalCrmConnectionRow } from "../../../domains/crm/ports/crmChannelConnectionProjection.js";
import type { CanonicalInboundMessageInput } from "../../../domains/crm/ports/crmCanonicalInboundRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

type CanonicalInboundConnectionRow = Pick<
  typeof providerConnections.$inferSelect,
  "broker" | "channel" | "metadata" | "provider" | "state"
>;

export async function assertCanonicalInboundConnection(
  db: DrizzleCrmClient,
  input: CanonicalInboundMessageInput,
) {
  const [connection] = await db
    .select({
      broker: providerConnections.broker,
      channel: providerConnections.channel,
      metadata: providerConnections.metadata,
      provider: providerConnections.provider,
      state: providerConnections.state,
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
  assertCanonicalInboundConnectionRow(connection, input);
}

export function assertCanonicalInboundConnectionRow(
  connection: CanonicalInboundConnectionRow | undefined,
  input: Pick<CanonicalInboundMessageInput, "channel" | "provider">,
) {
  if (
    !connection ||
    connection.channel !== input.channel ||
    connection.provider !== input.provider
  ) {
    throw new Error("Canonical CRM provider connection scope mismatch.");
  }

  const projection = projectCanonicalCrmConnectionRow({
    ...connection,
    metadata: readMetadata(connection.metadata),
  });
  if (
    !projection.readiness.ready ||
    !projection.capabilities.includes("inbound")
  ) {
    throw new Error(
      "Canonical CRM provider connection is not ready for inbound messaging.",
    );
  }
}

function readMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
