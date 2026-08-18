import { providerConnections } from "@lojaveiculosv2/db";
import { and, eq } from "drizzle-orm";
import type { CanonicalInboundMessageInput } from "../../../domains/crm/ports/crmCanonicalInboundRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function assertCanonicalInboundConnection(
  db: DrizzleCrmClient,
  input: CanonicalInboundMessageInput,
) {
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
}
