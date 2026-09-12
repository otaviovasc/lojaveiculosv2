import { randomUUID } from "node:crypto";
import * as schema from "@lojaveiculosv2/db";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function seedRawAttendanceCycle(db: DrizzleCrmClient) {
  const [scope] = await db
    .select({ storeId: schema.stores.id, tenantId: schema.stores.tenantId })
    .from(schema.stores)
    .limit(1);
  if (!scope) throw new Error("Seed one store before raw CRM validation.");
  const connectionId = randomUUID();
  const cycleId = randomUUID();
  const threadId = randomUUID();
  await db.insert(schema.crmChannelConnections).values({
    broker: "direct",
    channel: "whatsapp",
    displayName: "Raw concurrent attendance",
    id: connectionId,
    metadata: { capabilities: { inbound: true, outbound: true } },
    provider: "zapi",
    state: "active",
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  await db.insert(schema.conversationThreads).values({
    channel: "whatsapp",
    id: threadId,
    providerConnectionId: connectionId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  await db.insert(schema.conversationCycles).values({
    id: cycleId,
    threadId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  await db.insert(schema.conversationAttendances).values({
    cycleId,
    threadId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  return { cycleId, ...scope };
}
